import { runInAction } from "mobx";
import { nanoid } from "nanoid";
import {
  SnippetGroup,
  GROUP_TOKEN_ROW_GAP,
  GROUP_COLUMN_WIDTH,
  Rect,
  TOKEN_HEIGHT,
  Position,
  CHAR_WIDTH,
  SnippetOnCanvas,
  textEditorStateMobx,
  snippetsMobx,
  Snippet,
  SnippetSuggestion,
  INGREDIENT_TYPE,
  Span,
  snippetTypesMobx,
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

/** Given some snippet suggestions for a given text box,
 *  create snippets for those suggestions.
 */
export function createSnippetsForSuggestions(
  textId: string,
  suggestions: SnippetSuggestion[]
) {
  const snippets: Snippet[] = suggestions.map((suggestion) => {
    const textInSnippet = textEditorStateMobx
      .get(textId)!
      .sliceDoc(suggestion.span[0], suggestion.span[1])!;
    return {
      id: nanoid(),
      snippetTypeId: suggestion.snippetTypeId,
      textId,
      span: suggestion.span,
      type: "suggestion",
      data: snippetTypesMobx
        .get(suggestion.snippetTypeId)!
        .parse(textInSnippet),
    };
  });
  runInAction(() => {
    for (const snippet of snippets) {
      snippetsMobx.set(snippet.id, snippet);
    }
  });
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

export function createSnippetFromSpan(textId: string, span: Span): string {
  const textInSnippet = textEditorStateMobx
    .get(textId)
    ?.sliceDoc(span[0], span[1])!;
  const snippetId = nanoid();
  runInAction(() => {
    snippetsMobx.set(snippetId, {
      id: snippetId,
      snippetTypeId: INGREDIENT_TYPE,
      textId,
      span,
      data: snippetTypesMobx.get(INGREDIENT_TYPE)!.parse(textInSnippet),
    });
  });
  return snippetId;
}
