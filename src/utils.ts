import { runInAction } from "mobx";
import { nanoid } from "nanoid";
import {
  GROUP_TOKEN_ROW_GAP,
  Rect,
  TOKEN_HEIGHT,
  Position,
  CHAR_WIDTH,
  textEditorStateMobx,
  Highlight,
  INGREDIENT_TYPE,
  Span,
  highlighterTypesMobx,
  QUANTITY_TYPE,
} from "./primitives";
import {
  SnippetGroup,
  GROUP_COLUMN_WIDTH,
  SnippetOnCanvas,
  Snippet,
  snippetsMobx,
} from "./primitivesOld";

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

export function getRectForSnippetToken(snippetOnCanvas: SnippetOnCanvas): Rect {
  const snippet = getSnippetForSnippetOnCanvas(snippetOnCanvas);
  const text = textEditorStateMobx
    .get(snippet.textId)!
    .sliceDoc(snippet.span[0], snippet.span[1]);
  return [
    snippetOnCanvas.position[0] - window.scrollX,
    snippetOnCanvas.position[1] - window.scrollY,
    text.length * CHAR_WIDTH + 16,
    TOKEN_HEIGHT,
  ];
}

export function getPositionForSnippetInGroup(
  group: SnippetGroup,
  index: number
): Position {
  return [
    group.position[0],
    group.position[1] + index * (TOKEN_HEIGHT + GROUP_TOKEN_ROW_GAP),
  ];
}

export function getSnippetForSnippetOnCanvas(
  snippetOnCanvas: SnippetOnCanvas
): Snippet {
  return snippetsMobx.get(snippetOnCanvas.snippetId)!;
}

export function getParentByClassName(
  element: HTMLElement | { parentElement: HTMLElement | null },
  className: string
): HTMLElement | undefined {
  let iter: HTMLElement | null =
    element instanceof HTMLElement ? element : element.parentElement;
  while (iter !== null) {
    if (iter.classList.contains(className)) {
      return iter;
    }
    iter = iter.parentElement;
  }
  return undefined;
}

export const spanOverlaps = ([from, to]: Span, [from2, to2]: Span) => {
  return (from <= from2 && to >= from2) || (from2 <= from && to2 >= from);
};

export const spanEquals = (a: Span, b: Span) => a[0] === b[0] && a[1] === b[1];

export function createSnippetFromSpan(
  textId: string,
  span: Span,
  snippetTypeId: string
): string {
  const textInSnippet = textEditorStateMobx
    .get(textId)
    ?.sliceDoc(span[0], span[1])!;
  const snippetId = nanoid();
  runInAction(() => {
    snippetsMobx.set(snippetId, {
      id: snippetId,
      snippetTypeId,
      textId,
      span,
      data: highlighterTypesMobx.get(snippetTypeId)!.parse(textInSnippet),
    });
  });
  return snippetId;
}

// Find the nearest index to the left where a character occurs, starting from a given index
export const findPreviousCharacter = (
  index: number,
  character: string,
  text: string
): number => {
  let i = index;
  while (i >= 0) {
    if (text[i] === character) {
      return i;
    }
    i--;
  }
  return 0;
};

// Find the nearest index to the right where a character occurs, starting from a given index
export const findNextCharacter = (
  index: number,
  character: string,
  text: string
): number => {
  let i = index;
  while (i < text.length) {
    if (text[i] === character) {
      return i;
    }
    i++;
  }
  return text.length;
};

export const getLinkedHighlights = (
  highlight: Highlight,
  allHighlights: Highlight[]
): Highlight[] => {
  switch (highlight.highlighterTypeId) {
    case INGREDIENT_TYPE: {
      const link = allHighlights.find((h) => h.refs.ingredient === highlight);
      if (link) {
        return [link.refs.quantity];
      } else {
        return [];
      }
    }
    case QUANTITY_TYPE: {
      const link = allHighlights.find((h) => h.refs.quantity === highlight);
      if (link) {
        return [link.refs.ingredient];
      } else {
        return [];
      }
    }
    default: {
      return [];
    }
  }
  return [];
};
