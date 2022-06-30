import {
  SnippetGroup,
  GROUP_TOKEN_ROW_GAP,
  GROUP_COLUMN_WIDTH,
  Rect,
  TOKEN_HEIGHT,
} from "./primitives";

// your favorite dumping ground of utility functions
// ideally this file doesn't have dependencies outside primitives.ts

export function getRectForSnippetGroup(group: SnippetGroup): Rect {
  return [
    group.position[0] - 4,
    group.position[1] - 4,
    GROUP_COLUMN_WIDTH * (1 + group.extraColumns.length) + 8,
    group.snippetIds.length * TOKEN_HEIGHT +
      (group.snippetIds.length - 1) * GROUP_TOKEN_ROW_GAP +
      8,
  ];
}
