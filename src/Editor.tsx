import {
  Facet,
  SelectionRange,
  EditorSelection,
  StateEffect,
  StateField,
  Prec,
} from "@codemirror/state";
import {
  ViewPlugin,
  ViewUpdate,
  Decoration,
  WidgetType,
  hoverTooltip,
} from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { autorun, comparer, computed, reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useRef, useEffect, useMemo } from "react";
import {
  dragNewSnippetEmitter,
  snippetsMobx,
  Snippet,
  Highlight,
  textEditorStateMobx,
  snippetTypesMobx,
  snippetTypeViewConfigurationsMobx,
  spatialHoverSnippetIdBox,
  textEditorViewsMap,
  Span,
  spatialComponentsMobx,
  SpatialComponentType,
  INGREDIENT_TYPE,
  INGREDIENT_REFERENCE_TYPE,
  QUANTITY_TYPE,
  INGREDIENT_WITH_QUANTITY_TYPE,
  EXERCISE_NAME_TYPE,
  SETS_AND_REPS_TYPE,
  EXERCISE_ACTIVITY_TYPE,
} from "./primitives";
import {
  createSnippetFromSpan,
  createSnippetsForSuggestions,
  getLinkedHighlights,
  getParentByClassName,
  spanEquals,
  spanOverlaps,
} from "./utils";
import ReactDOM from "react-dom/client";
import { SnippetTokenHovercardContent } from "./SnippetTokenHovercardContent";
import pick from "lodash/pick";

// Cursor is inside the suggestion or just a little to the right
const suggestionActive = (suggestion: Highlight, cursorPosition: number) =>
  cursorPosition >= suggestion.span[0] &&
  cursorPosition <= suggestion.span[1] + 1;

const textIdFacet = Facet.define<string, string>({
  combine: (values) => values[0],
});

const setSnippetSuggestionsEffect = StateEffect.define<Highlight[]>();
const snippetSuggestionsField = StateField.define<Highlight[]>({
  create() {
    return [];
  },
  update(suggestions, tr) {
    for (let e of tr.effects) {
      if (e.is(setSnippetSuggestionsEffect)) {
        return e.value;
      }
    }

    if (!tr.docChanged) {
      return suggestions;
    }

    return suggestions.map((suggestion) => ({
      ...suggestion,
      span: [
        tr.changes.mapPos(suggestion.span[0]),
        tr.changes.mapPos(suggestion.span[1]),
      ],
    }));
  },
});

const suggestionDecorations = EditorView.decorations.from(
  snippetSuggestionsField,
  (highlights) => (view) => {
    const pos = view.state.selection.main.anchor;
    console.log({ pos });

    // We don't want to show ingredientWithQuantity snippets... todo: figure out how to hide
    const visibleSnippetTypes = [
      INGREDIENT_TYPE,
      INGREDIENT_REFERENCE_TYPE,
      QUANTITY_TYPE,
    ];

    return Decoration.set(
      highlights.flatMap((highlight) => {
        const linkedHighlights = getLinkedHighlights(highlight, highlights);
        const active = [highlight, ...linkedHighlights].some((highlight) =>
          spanOverlaps(highlight.span, [pos, pos])
        );
        if (
          highlight.span[1] <= highlight.span[0] ||
          !visibleSnippetTypes.includes(highlight.highlighterTypeId)
        ) {
          return [];
        }
        const decoration = Decoration.mark({
          class: `cm-suggestion cm-suggestion-${highlight.highlighterTypeId} ${
            active ? "cm-suggestion-active" : ""
          }`,
        });
        return [decoration.range(highlight.span[0], highlight.span[1])];
      }),
      true
    );
  }
);

const setSnippetsEffect =
  StateEffect.define<(Snippet & { properties: string[] })[]>();
const snippetsField = StateField.define<(Snippet & { properties: string[] })[]>(
  {
    create() {
      return [];
    },
    update(snippets, tr) {
      for (let e of tr.effects) {
        if (e.is(setSnippetsEffect)) {
          return e.value;
        }
      }
      return snippets.map((snippet) => ({
        ...snippet,
        span: [
          tr.changes.mapPos(snippet.span[0]),
          tr.changes.mapPos(snippet.span[1]),
        ],
      }));
    },
  }
);

const setSpatialHoverSnippetId = StateEffect.define<string | undefined>();
const spatialHoverSnippetIdField = StateField.define<string | undefined>({
  create() {
    return undefined;
  },
  update(hoverSnippetId, tr) {
    for (let e of tr.effects) {
      if (e.is(setSpatialHoverSnippetId)) {
        return e.value;
      }
    }
    return hoverSnippetId;
  },
});

const dragSnippetPlugin = ViewPlugin.fromClass(
  class {
    lastUpdate: any;
    constructor(view: EditorView) {}
    update(update: ViewUpdate) {
      this.lastUpdate = update;
    }
    destroy() {}
  },
  {
    eventHandlers: {
      mousedown(event, view) {
        if (event.metaKey) {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos === null) {
            return;
          }
          const snippetRanges: [
            range: SelectionRange,
            snippetId: string | undefined
          ][] = view.state.field(snippetsField).map((snippet) => {
            const [from, to] = snippet.span;
            return [EditorSelection.range(from, to), snippet.id];
          });
          snippetRanges.push(
            ...view.state.selection.ranges
              .filter((range) => !range.empty)
              .map<[SelectionRange, undefined]>((range) => [range, undefined])
          );
          const overlappingSnippetRange = snippetRanges.find(
            ([range]) => pos >= range.from && pos < range.to
          );
          if (overlappingSnippetRange !== undefined) {
            const [range, snippetId] = overlappingSnippetRange;
            const fromPos = view.coordsAtPos(range.from)!;
            const left = fromPos.left - 8;
            const top = fromPos.top - 5;
            dragNewSnippetEmitter.emit("start", {
              snippetId,
              textId: view.state.facet(textIdFacet),
              spanPosition: [left, top],
              span: [range.from, range.to],
              mouseOffset: [left - event.clientX, top - event.clientY],
              text: view.state.sliceDoc(range.from, range.to),
              shiftKey: event.shiftKey,
              altKey: event.altKey,
            });
            // We only want to drag out a single snippet
            return true;
          } else {
            const suggestions = view.state.field(snippetSuggestionsField);
            const suggestionAtPos = suggestions.find(
              (suggestion) =>
                pos >= suggestion.span[0] && pos < suggestion.span[1]
            );
            if (suggestionAtPos !== undefined) {
              const textId = view.state.facet(textIdFacet);
              runInAction(() => {
                createSnippetFromSpan(
                  textId,
                  suggestionAtPos.span,
                  suggestionAtPos.highlighterTypeId
                );
              });
              return true;
            }
          }
        }
      },
    },
  }
);

const ANNOTATION_TOKEN_CLASSNAME = "annotation-token";
class SnippetDataWidget extends WidgetType {
  constructor(
    readonly snippetId: string,
    readonly snippetData: { [key: string]: string },
    readonly snippetProperties: string[]
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof SnippetDataWidget &&
      comparer.structural(this.snippetData, other.snippetData) &&
      comparer.structural(this.snippetProperties, other.snippetProperties)
    );
  }

  toDOM() {
    const root = document.createElement("span");
    root.className = "relative";
    const wrap = document.createElement("span");
    root.appendChild(wrap);
    wrap.className = "absolute bottom-full left-0 flex gap-1";
    wrap.setAttribute("aria-hidden", "true");
    if (this.snippetData === undefined) {
      return wrap;
    }
    for (const [key, value] of Object.entries(this.snippetData)) {
      if (value === undefined) {
        continue;
      }
      const token = document.createElement("span");
      token.className = `${ANNOTATION_TOKEN_CLASSNAME} text-gray-500 text-[8px] leading-[8px] whitespace-nowrap relative top-0.5`;
      token.innerText = value;
      token.setAttribute("data-snippet-id", this.snippetId);
      token.setAttribute("data-snippet-property-name", key);
      wrap.appendChild(token);
    }
    return root;
  }

  ignoreEvent(event: Event): boolean {
    return false;
  }
}

const snippetAnnotationPlugin = ViewPlugin.define((view) => ({}), {
  eventHandlers: {
    mousedown(e, view) {
      if (!e.metaKey) {
        return;
      }

      const target = e.target as HTMLElement;
      const parentAnnotationToken = getParentByClassName(
        target,
        ANNOTATION_TOKEN_CLASSNAME
      );

      if (parentAnnotationToken !== undefined) {
        const snippetId = parentAnnotationToken.getAttribute("data-snippet-id");
        if (snippetId !== null) {
          const snippet = snippetsMobx.get(snippetId)!;
          const snippetProperties = snippetTypesMobx.get(
            snippet.snippetTypeId
          )?.properties;
          const snippetPropertyName = parentAnnotationToken.getAttribute(
            "data-snippet-property-name"
          );
          const property =
            snippetProperties &&
            snippetProperties.find((p) => p.id === snippetPropertyName);
        }
      }
      return false;
    },
  },
});

const snippetDecorations = EditorView.decorations.compute(
  [snippetsField, spatialHoverSnippetIdField],
  (state) => {
    const spatialHoverSnippetId = state.field(spatialHoverSnippetIdField);
    return Decoration.set(
      state.field(snippetsField).flatMap((snippet) =>
        snippet.span[1] > snippet.span[0]
          ? [
              Decoration.mark({
                class: `cm-snippet${
                  snippet.id === spatialHoverSnippetId
                    ? " cm-snippet-spatial-hover"
                    : ""
                }`,
              }).range(snippet.span[0], snippet.span[1]),
              Decoration.widget({
                widget: new SnippetDataWidget(
                  snippet.id,
                  snippet.data,
                  snippet.properties
                ),
                side: 1,
              }).range(snippet.span[0]),
            ]
          : []
      ),
      true
    );
  }
);

const snippetHover = hoverTooltip((view, pos, side) => {
  const textId = view.state.facet(textIdFacet);
  for (const snippet of snippetsMobx.values()) {
    if (snippet.textId !== textId) {
      continue;
    }
    if (pos >= snippet.span[0] && pos < snippet.span[1]) {
      return {
        pos: snippet.span[0],
        end: snippet.span[1],
        above: false,
        create(view) {
          let dom = document.createElement("div");
          dom.className =
            "border border-zinc-100 bg-white rounded-md shadow-lg mt-1";
          // You can't handle when a codemirror tooltip unmounts so this is going
          // to be dangling for now.
          ReactDOM.createRoot(dom).render(
            <SnippetTokenHovercardContent snippet={snippet} />
          );
          return { dom, offset: { x: 0, y: -8 } };
        },
      };
    }
  }
  return null;
});

export const Editor = observer(({ textId }: { textId: string }) => {
  const editorRef = useRef(null);
  const suggestionsComputed = useMemo(
    () =>
      computed(() => {
        const text = computed(() =>
          textEditorStateMobx.get(textId)!.sliceDoc(0)
        );
        const highlights: Highlight[] = [...snippetTypesMobx.values()].reduce<
          Highlight[]
        >(
          (highlights, st) =>
            highlights.concat(st.highlight(text.get(), highlights)),
          []
        );
        // const pos = textEditorStateMobx.get(textId)?.selection.asSingle().main.from;
        const existingSnippets = [...snippetsMobx.values()].filter(
          (snippet) => snippet.textId === textId
        );
        // Filter down to only the suggestions that do not overlap with an existing snippet's span
        const filteredSuggestions = highlights.filter((suggestion) => {
          return existingSnippets.every(
            (snippet) => !spanOverlaps(snippet.span, suggestion.span)
          );
        });
        return filteredSuggestions;
      }),
    [textId]
  );

  useEffect(() => {
    const view = new EditorView({
      doc: textEditorStateMobx.get(textId)?.doc ?? "",
      extensions: [
        minimalSetup,
        EditorView.theme({
          "&": {
            height: "100%",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "#e4e4e7",
            color: "red",
          },
          "&.cm-editor.cm-focused": {
            outline: "none",
          },
          ".cm-scroller": {
            fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
            fontSize: "1rem",
            lineHeight: "1.75em",
          },
          ".cm-suggestion": {
            padding: "0 2px",
            boxSizing: "border-box",
          },
          [`.cm-suggestion-${INGREDIENT_TYPE}`]: {
            color: "hsla(212, 42%, 40%, 1)",
            backgroundColor: "#52a4ff11",
          },
          [`.cm-suggestion-active.cm-suggestion-${INGREDIENT_TYPE}`]: {
            borderBottom: "2px solid hsla(212, 42%, 40%, 1)",
          },
          [`.cm-suggestion-${INGREDIENT_REFERENCE_TYPE}`]: {
            color: "hsl(109deg 90% 27%)",
            backgroundColor: "#30b41311",
          },
          [`.cm-suggestion-active.cm-suggestion-${INGREDIENT_REFERENCE_TYPE}`]:
            {
              borderBottom: "2px solid hsl(109deg 90% 27%)",
            },
          [`.cm-suggestion-${QUANTITY_TYPE}`]: {
            color: "hsl(349deg 80% 48%)",
            backgroundColor: "#ff5d7a11",
          },
          [`.cm-suggestion-active.cm-suggestion-${QUANTITY_TYPE}`]: {
            borderBottom: "2px solid hsl(349deg 80% 48%)",
          },
          ".metakey-down & .cm-suggestion:hover, .metakey-down & .cm-snippet:hover":
            {
              cursor: "pointer",
            },
          ".metakey-down.shiftkey-down & .cm-suggestion-shift-range": {
            borderBottom: "2px dashed black",
          },
          ".cm-snippet": {
            borderBottom: "1px solid black",
          },
          ".metakey-down & .cm-snippet:hover": {
            cursor: "grab",
          },
          ".cm-snippet-spatial-hover": {
            backgroundColor: "black",
            color: "white",
          },
          ".cm-snippet .cm-suggestion": {
            backgroundColor: "#80808015",
            textDecoration: "none",
          },
          ".cm-tooltip": {
            border: "none",
            backgroundColor: "transparent",
          },
        }),
        EditorView.lineWrapping,
        textIdFacet.of(textId),
        dragSnippetPlugin,
        snippetSuggestionsField,
        suggestionDecorations,
        snippetsField,
        snippetDecorations,
        snippetAnnotationPlugin,
        snippetHover,
        spatialHoverSnippetIdField,
      ],
      parent: editorRef.current!,
      dispatch(transaction) {
        view.update([transaction]);
        runInAction(() => {
          for (const snippet of snippetsMobx.values()) {
            if (snippet.textId === textId) {
              const newSpan: Span = [
                transaction.changes.mapPos(snippet.span[0]),
                transaction.changes.mapPos(snippet.span[1]),
              ];
              if (newSpan[0] === newSpan[1]) {
                snippetsMobx.delete(snippet.id);
                spatialComponentsMobx.replace(
                  spatialComponentsMobx.filter(
                    (s) =>
                      !(
                        s.spatialComponentType ===
                          SpatialComponentType.Snippet &&
                        s.snippetId === snippet.id
                      )
                  )
                );
              } else {
                snippet.span = newSpan;
              }
            }
          }

          textEditorStateMobx.set(textId, transaction.state);
        });
      },
    });
    textEditorViewsMap[textId] = view;

    runInAction(() => {
      textEditorStateMobx.set(textId, view.state);
    });
    const unsubscribes: (() => void)[] = [
      reaction(
        () => suggestionsComputed.get(),
        (snippetSuggestions) => {
          view.dispatch({
            effects: [setSnippetSuggestionsEffect.of(snippetSuggestions)],
          });
        },
        { equals: comparer.structural, fireImmediately: true }
      ),
      reaction(
        () => {
          const snippets = [...snippetsMobx.values()].filter(
            (snippet) => snippet.textId === textId
          );
          return snippets.map((snippet) => {
            const snippetType = snippetTypesMobx.get(snippet.snippetTypeId)!;
            const snippetTypeConfig = snippetTypeViewConfigurationsMobx.get(
              snippet.snippetTypeId
            )!;

            // Get the inline properties that are visible,
            // in the order that they're declared on the snippet type
            const inlineProperties = snippetType.properties
              .map((p) => p.id)
              .filter((propertyId) =>
                snippetTypeConfig.inlineVisiblePropertyIds.includes(propertyId)
              );
            const inlineVisibleData = pick(snippet.data, inlineProperties);
            return {
              ...snippet,
              data: inlineVisibleData,
              properties: inlineProperties,
            };
          });
        },
        (snippets) => {
          view.dispatch({
            effects: [setSnippetsEffect.of(snippets)],
          });
        },
        { equals: comparer.structural }
      ),
      autorun(() => {
        view.dispatch({
          effects: [
            setSpatialHoverSnippetId.of(spatialHoverSnippetIdBox.get()),
          ],
        });
      }),
    ];
    return () => {
      view.destroy();
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      delete textEditorViewsMap[textId];
    };
  }, []);

  const allSuggestions = suggestionsComputed.get();
  // const allSuggestions: Highlight[] = [];

  const ingredientHighlights = allSuggestions
    .sort((a, b) => a.span[0] - b.span[0])
    .filter((s) => s.highlighterTypeId === INGREDIENT_TYPE)
    .map((ingredientHighlight) => {
      const ingredientWithQuantity = allSuggestions.find(
        (otherSuggestion) =>
          otherSuggestion.highlighterTypeId === INGREDIENT_WITH_QUANTITY_TYPE &&
          otherSuggestion.refs.ingredient === ingredientHighlight
      );

      const text = textEditorStateMobx
        .get(textId)
        ?.doc.sliceString(
          ingredientHighlight.span[0],
          ingredientHighlight.span[1]
        );

      return {
        ...ingredientHighlight,
        text,
        quantity: ingredientWithQuantity?.refs.quantity,
      };
    });

  return (
    <div>
      <div
        className="text-lg h-[500px] bg-white border-black border-b-2 border-l-2 border-r-2 rounded-b-lg overflow-auto"
        ref={editorRef}
      ></div>

      {ingredientHighlights.length > 0 && (
        <div className="absolute left-[550px] top-0 w-[300px]">
          <span className="font-bold text-sm text-gray-400">
            Ingredients Summary
          </span>

          {ingredientHighlights.map((highlight) => (
            <div
              className="border-gray-300 border p-1 my-1 rounded-lg flex"
              key={highlight.span[0]}
            >
              <div>{highlight.text} </div>
              <div className="text-gray-400 ml-2 right">
                {highlight.quantity &&
                  `(${highlight.quantity.data["quantity--quantity"]} ${highlight.quantity.data["quantity--unitOfMeasure"]})`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
