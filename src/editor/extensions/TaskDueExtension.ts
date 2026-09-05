import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { formatDueDate } from '../../domain/taskDueDates';
import { todayISO } from '../../domain/calendarDates';

export interface TaskDueBadgeClickInfo {
  from: number;
  clearFrom: number;
  to: number;
  dueDate: string;
  x: number;
  y: number;
}

export interface TaskDuePickerTarget {
  from: number;
  clearFrom: number;
  to: number;
  dueDate: string | null;
  x: number;
  y: number;
}

export interface TaskDueExtensionOptions {
  onBadgeClick?: (info: TaskDueBadgeClickInfo) => void;
}

const DUE_TOKEN_PATTERN = /@due\((\d{4}-\d{2}-\d{2})\)/gi;

function dueState(dueDate: string, checked: boolean, today: string): string {
  if (checked) return 'completed';
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
}

function isValidEditorRange(
  editor: Editor,
  from: number,
  clearFrom: number,
  to: number
): boolean {
  const size = editor.state.doc.content.size;
  return (
    [from, clearFrom, to].every(Number.isInteger) &&
    clearFrom >= 0 &&
    from >= clearFrom &&
    to >= from &&
    to <= size + 1
  );
}

export function setEditorTaskDueDate(
  editor: Editor,
  info: Pick<TaskDuePickerTarget, 'from' | 'clearFrom' | 'to'> & {
    dueDate?: TaskDuePickerTarget['dueDate'];
  },
  dueDate: string | null
): boolean {
  const { from, clearFrom, to } = info;
  if (!isValidEditorRange(editor, from, clearFrom, to)) return false;

  if (dueDate === null) {
    const { doc } = editor.state;
    let deleteTo = to;
    if (deleteTo < doc.content.size && /\s/.test(doc.textBetween(deleteTo, deleteTo + 1, '\ufffc'))) {
      deleteTo += 1;
    }

    return editor.chain().focus().deleteRange({ from: clearFrom, to: deleteTo }).run();
  }

  const token = `@due(${dueDate})`;
  const isExistingToken = info.dueDate !== undefined || from < to;

  return editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, isExistingToken ? token : ` ${token} `)
    .run();
}

export function getEditorTaskDueTarget(
  editor: Editor,
  x: number,
  y: number
): TaskDuePickerTarget {
  const { doc, selection } = editor.state;
  const $from = doc.resolve(selection.from);

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const ancestor = $from.node(depth);
    if (ancestor.type.name !== 'taskItem') continue;

    const itemFrom = $from.before(depth);
    const itemTo = $from.after(depth);
    const textNodes: Array<{ node: ProsemirrorNode; pos: number }> = [];
    doc.nodesBetween(itemFrom, itemTo, (node, nodePos) => {
      if (node.isText) textNodes.push({ node: node as ProsemirrorNode, pos: nodePos });
      return true;
    });

    let matchedRange: { from: number; to: number; dueDate: string } | null = null;
    for (const { node, pos } of textNodes) {
      if (!node.text) continue;

      DUE_TOKEN_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = DUE_TOKEN_PATTERN.exec(node.text)) !== null) {
        const from = pos + match.index;
        const to = from + match[0].length;
        matchedRange = { from, to, dueDate: match[1] };
        break;
      }
      if (matchedRange) break;
    }

    if (matchedRange) {
      let clearFrom = matchedRange.from;
      while (
        clearFrom > itemFrom &&
        /\s/.test(doc.textBetween(clearFrom - 1, clearFrom, '\ufffc'))
      ) {
        clearFrom -= 1;
      }

      return { ...matchedRange, clearFrom, x, y };
    }

    return {
      from: selection.from,
      clearFrom: selection.from,
      to: selection.to,
      dueDate: null,
      x,
      y,
    };
  }

  return {
    from: selection.from,
    clearFrom: selection.from,
    to: selection.to,
    dueDate: null,
    x,
    y,
  };
}

export const TaskDueExtension = Extension.create<TaskDueExtensionOptions>({
  name: 'taskDue',

  addOptions() {
    return {
      onBadgeClick: undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey('taskDueDecorations'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const today = todayISO();
            const { doc } = state;

            doc.descendants((node, nodePos) => {
              if (!node.isText || !node.text) return;

              DUE_TOKEN_PATTERN.lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = DUE_TOKEN_PATTERN.exec(node.text)) !== null) {
                const dueDate = match[1];
                const from = nodePos + match.index;
                const to = from + match[0].length;
                const $from = doc.resolve(from);

                let inTaskItem = false;
                let checked = false;
                for (let depth = $from.depth; depth > 0; depth -= 1) {
                  const ancestor = $from.node(depth);
                  if (ancestor.type.name === 'taskItem') {
                    inTaskItem = true;
                    checked = Boolean(ancestor.attrs.checked);
                    break;
                  }
                }

                if (!inTaskItem) continue;
                const stateName = dueState(dueDate, checked, today);
                const label = checked
                  ? `Done • ${formatDueDate(dueDate)}`
                  : `Due ${formatDueDate(dueDate)}`;

                decorations.push(
                  Decoration.inline(from, to, {
                    class: `am-task-due am-task-due-${stateName}`,
                    'data-task-due': dueDate,
                    'data-task-due-state': stateName,
                    'data-label': label,
                    title: 'Change or clear due date',
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },

          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement | null;
              if (!target?.closest('.am-task-due')) return false;

              const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!coords) return true;

              const { doc } = view.state;
              const $pos = doc.resolve(coords.pos);
              const parentStart = $pos.start();
              const parentText = $pos.parent.textBetween(
                0,
                $pos.parent.content.size,
                undefined,
                '\ufffc'
              );

              DUE_TOKEN_PATTERN.lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = DUE_TOKEN_PATTERN.exec(parentText)) !== null) {
                const from = parentStart + match.index;
                const to = from + match[0].length;
                if (coords.pos >= from && coords.pos <= to) {
                  let whitespaceStart = from;
                  while (whitespaceStart > parentStart && /\s/.test(parentText[whitespaceStart - parentStart - 1])) {
                    whitespaceStart -= 1;
                  }

                  options.onBadgeClick?.({
                    from,
                    clearFrom: whitespaceStart,
                    to,
                    dueDate: match[1],
                    x: event.clientX,
                    y: event.clientY,
                  });
                  return true;
                }
              }

              return true;
            },
          },
        },
      }),
    ];
  },
});
