import {
  SnippetGroup,
  GROUP_TOKEN_GAP,
  GROUP_WIDTH,
  Rect,
  TOKEN_HEIGHT,
} from "./primitives";

// your favorite dumping ground of utility functions
// ideally this file doesn't have dependencies outside primitives.ts

export function getRectForSnippetGroup(group: SnippetGroup): Rect {
  return [
    group.position[0] - 4,
    group.position[1] - 4,
    GROUP_WIDTH + 8,
    group.snippetIds.length * TOKEN_HEIGHT +
      (group.snippetIds.length - 1) * GROUP_TOKEN_GAP +
      8,
  ];
}
