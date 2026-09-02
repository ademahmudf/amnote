export type DiffLineType = 'equal' | 'added' | 'removed';

export interface DiffLine {
  type: DiffLineType;
  text: string;
  leftNumber?: number;
  rightNumber?: number;
}

const MAX_COMPARED_LINES = 2_000;

/**
 * Line diff using an LCS. Common prefix/suffix are trimmed first so note edits
 * remain fast. Very large unrelated files fall back to a stable sequential diff.
 */
export function diffLines(left: string, right: string): DiffLine[] {
  const leftAll = left.split('\n');
  const rightAll = right.split('\n');

  let start = 0;
  while (start < leftAll.length && start < rightAll.length && leftAll[start] === rightAll[start]) {
    start += 1;
  }

  let leftEnd = leftAll.length;
  let rightEnd = rightAll.length;
  while (leftEnd > start && rightEnd > start && leftAll[leftEnd - 1] === rightAll[rightEnd - 1]) {
    leftEnd -= 1;
    rightEnd -= 1;
  }

  const prefix = leftAll.slice(0, start).map((text, index) => ({
    type: 'equal' as const,
    text,
    leftNumber: index + 1,
    rightNumber: index + 1,
  }));

  const suffixLeftStart = leftEnd;
  const suffixRightStart = rightEnd;
  const middleLeft = leftAll.slice(start, suffixLeftStart);
  const middleRight = rightAll.slice(start, suffixRightStart);
  const middle = computeMiddleDiff(middleLeft, middleRight, start + 1, start + 1);

  return [...prefix, ...middle];
}

function computeMiddleDiff(
  left: string[],
  right: string[],
  leftNumberOffset: number,
  rightNumberOffset: number
): DiffLine[] {
  if (left.length + right.length > MAX_COMPARED_LINES) {
    return [
      ...left.map((text, index) => ({
        type: 'removed' as const,
        text,
        leftNumber: leftNumberOffset + index,
      })),
      ...right.map((text, index) => ({
        type: 'added' as const,
        text,
        rightNumber: rightNumberOffset + index,
      })),
    ];
  }

  const distances: number[][] = Array.from(
    { length: left.length + 1 },
    () => new Array<number>(right.length + 1).fill(0)
  );

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      distances[i][j] = left[i] === right[j]
        ? distances[i + 1][j + 1] + 1
        : Math.max(distances[i + 1][j], distances[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      lines.push({
        type: 'equal',
        text: left[i],
        leftNumber: leftNumberOffset + i,
        rightNumber: rightNumberOffset + j,
      });
      i += 1;
      j += 1;
    } else if (distances[i + 1][j] >= distances[i][j + 1]) {
      lines.push({ type: 'removed', text: left[i], leftNumber: leftNumberOffset + i });
      i += 1;
    } else {
      lines.push({ type: 'added', text: right[j], rightNumber: rightNumberOffset + j });
      j += 1;
    }
  }
  while (i < left.length) {
    lines.push({ type: 'removed', text: left[i], leftNumber: leftNumberOffset + i });
    i += 1;
  }
  while (j < right.length) {
    lines.push({ type: 'added', text: right[j], rightNumber: rightNumberOffset + j });
    j += 1;
  }

  return lines;
}
