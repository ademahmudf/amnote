import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useSettingsStore } from '../../store/useSettingsStore';

export const TypewriterMode = Extension.create({
  name: 'typewriterMode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('typewriterMode'),
        view() {
          return {
            update(view) {
              const { typewriterMode } = useSettingsStore.getState();
              if (!typewriterMode || !view.hasFocus()) return;

              const { state } = view;
              const { selection } = state;
              if (!selection.empty) return;

              const coords = view.coordsAtPos(selection.from);
              const scrollContainer = view.dom.closest('.overflow-y-auto') || window;

              if (scrollContainer instanceof HTMLElement) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const targetY = containerRect.top + containerRect.height / 2.3;
                const delta = coords.top - targetY;

                if (Math.abs(delta) > 15) {
                  scrollContainer.scrollTop += delta * 0.4;
                }
              }
            },
          };
        },
      }),
    ];
  },
});
