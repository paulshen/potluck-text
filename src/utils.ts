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
  SpatialComponentType,
  spatialComponentsMobx,
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
    snippetOnCanvas.position[0],
    snippetOnCanvas.position[1],
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
 *  create snippets for those suggestions,
 *  and also create corresponding SnippetOnCanvas objects on the canvas.
 *  (Note: this side effects on the MobX state.)
 */
export function createSnippetsOnCanvasForSuggestions(
  textId: string,
  suggestions: SnippetSuggestion[]
) {
  const snippets: Snippet[] = suggestions.map((suggestion) => {
    return {
      id: nanoid(),
      snippetTypeId: suggestion.snippetTypeId,
      textId,
      span: suggestion.span,
      type: "suggestion",
      data: {},
    };
  });

  const snippetsOnCanvas: SnippetOnCanvas[] = snippets.map((snippet, index) => {
    return {
      spatialComponentType: SpatialComponentType.Snippet,
      id: nanoid(),
      snippetId: snippet.id,
      // Randomly scattered in a reasonable spot; todo: make nicer positions
      position: [
        700 + Math.random() * 10,
        50 +
          index * (TOKEN_HEIGHT + GROUP_TOKEN_ROW_GAP + 5) +
          Math.random() * 5,
      ],
    };
  });

  for (const snippet of snippets) {
    snippetsMobx.set(snippet.id, snippet);
  }

  for (const snippetOnCanvas of snippetsOnCanvas) {
    spatialComponentsMobx.push(snippetOnCanvas);
  }
}
