import {
  SnippetGroup,
  GROUP_TOKEN_ROW_GAP,
  GROUP_COLUMN_WIDTH,
  Rect,
  TOKEN_HEIGHT,
  Position,
} from "./primitives";

// your favorite dumping ground of utility functions
// ideally this file doesn't have dependencies outside primitives.ts and npm packages

export function doesRectContainPosition(rect: Rect, pos: Position) {
  return (
    pos[0] >= rect[0] &&
    pos[0] <= rect[0] + rect[2] &&
    pos[1] >= rect[1] &&
    pos[1] <= rect[1] + rect[3]
  );
}

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
