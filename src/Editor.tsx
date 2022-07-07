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
import { useRef, useEffect } from "react";
import {
  dragNewSnippetEmitter,
  snippetsMobx,
  Snippet,
  SnippetSuggestion,
  textEditorStateMobx,
  snippetTypesMobx,
  snippetTypeViewConfigurationsMobx,
  spatialHoverSnippetIdBox,
  textEditorViewsMap,
} from "./primitives";
import {
  createSnippetFromSpan,
  createSnippetsForSuggestions,
  getParentByClassName,
  spanOverlaps,
} from "./utils";
import ReactDOM from "react-dom/client";
import { SnippetTokenHovercardContent } from "./SnippetTokenHovercardContent";
import pick from "lodash/pick";

// Cursor is inside the suggestion or just a little to the right
const suggestionActive = (
  suggestion: SnippetSuggestion,
  cursorPosition: number
) =>
  cursorPosition >= suggestion.span[0] &&
  cursorPosition <= suggestion.span[1] + 1;

const textIdFacet = Facet.define<string, string>({
  combine: (values) => values[0],
});

const setSnippetSuggestionsEffect = StateEffect.define<SnippetSuggestion[]>();
const snippetSuggestionsField = StateField.define<SnippetSuggestion[]>({
  create() {
    return [];
  },
  update(suggestions, tr) {
    for (let e of tr.effects) {
      if (e.is(setSnippetSuggestionsEffect)) {
        return e.value;
      }
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
const suggestionMark = Decoration.mark({ class: "cm-suggestion" });
const activeSuggestionMark = Decoration.mark({
  class: "cm-suggestion cm-suggestion-active",
});
const suggestionDecorations = EditorView.decorations.from(
  snippetSuggestionsField,
  (suggestions) => (view) => {
    const pos = view.state.selection.asSingle().main.anchor;

    return Decoration.set(
      suggestions.flatMap((suggestion) => {
        if (suggestion.span[1] <= suggestion.span[0]) {
          return [];
        }
        const active = suggestionActive(suggestion, pos);
        return active
          ? [activeSuggestionMark.range(suggestion.span[0], suggestion.span[1])]
          : [suggestionMark.range(suggestion.span[0], suggestion.span[1])];
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

// Accept suggestions (just the one near the cursor, or all) with keyboard shortcuts
const acceptSuggestionsPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {}
    update(update: ViewUpdate) {}
    destroy() {}
  },
  {
    eventHandlers: {
      keydown(event, view) {
        // Cmd-shift-enter will accept all suggestions if no range selected,
        // or accept within the selected range if there is one
        if (event.key === "Enter" && event.metaKey && event.shiftKey) {
          event.preventDefault();

          const textId = view.state.facet(textIdFacet);
          const suggestions = view.state.field(snippetSuggestionsField);

          const selection = view.state.selection.main;
          const rangeSelected = selection.from !== selection.to;

          if (rangeSelected) {
            createSnippetsForSuggestions(
              textId,
              suggestions.filter((suggestion) =>
                spanOverlaps(suggestion.span, [selection.from, selection.to])
              )
            );
          } else {
            createSnippetsForSuggestions(textId, suggestions);
          }
        } else if (event.key === "Enter" && event.metaKey) {
          event.preventDefault();

          const textId = view.state.facet(textIdFacet);
          const pos = view.state.selection.asSingle().main.anchor;
          const suggestions = view.state.field(snippetSuggestionsField);
          const suggestionNearPos = suggestions.find((suggestion) =>
            suggestionActive(suggestion, pos)
          );
          if (suggestionNearPos) {
            createSnippetFromSpan(
              textId,
              suggestionNearPos.span,
              suggestionNearPos.snippetTypeId
            );
          }
        }
      },
    },
  }
);

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
                  suggestionAtPos.snippetTypeId
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

          if (property?.onClick) {
            property.onClick(snippet, view);
            return true;
          }
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
            "border border-zinc-100 bg-white rounded-md shadow-lg";
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
  const suggestionsComputed = computed(() => {
    const text = computed(() => textEditorStateMobx.get(textId)!.sliceDoc(0));
    const suggestions: SnippetSuggestion[] = [
      ...snippetTypesMobx.values(),
    ].flatMap((st) => st.suggest(text.get()));
    const existingSnippets = [...snippetsMobx.values()].filter(
      (snippet) => snippet.textId === textId
    );
    // Filter down to only the suggestions that do not overlap with an existing snippet's span
    const filteredSuggestions = suggestions.filter((suggestion) => {
      return existingSnippets.every(
        (snippet) => !spanOverlaps(snippet.span, suggestion.span)
      );
    });
    return filteredSuggestions;
  });
  const numSuggestions = computed(() => suggestionsComputed.get().length).get();

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
          ".cm-suggestion-active": {
            borderBottom: "1px dashed black",
          },
          ".metakey-down & .cm-suggestion.cm-suggestion-active": {
            borderBottom: "2px dashed black",
          },
          ".metakey-down & .cm-suggestion": {
            borderBottom: "1px dashed black",
          },
          ".metakey-down & .cm-suggestion:hover, .metakey-down & .cm-snippet:hover":
            {
              cursor: "pointer",
            },
          ".metakey-down.shiftkey-down & .cm-suggestion": {
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
        Prec.high(acceptSuggestionsPlugin), // high priority so we can intercept enter events early
      ],
      parent: editorRef.current!,
      dispatch(transaction) {
        view.update([transaction]);
        runInAction(() => {
          for (const snippet of snippetsMobx.values()) {
            if (snippet.textId === textId) {
              snippet.span = [
                transaction.changes.mapPos(snippet.span[0]),
                transaction.changes.mapPos(snippet.span[1]),
              ];
            }
          }
          const snippetSuggestions = suggestionsComputed.get();
          if (snippetSuggestions !== undefined) {
            snippetSuggestions.forEach((suggestion) => {
              suggestion.span = [
                transaction.changes.mapPos(suggestion.span[0]),
                transaction.changes.mapPos(suggestion.span[1]),
              ];
            });
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

  return (
    <div
      className="text-lg h-[480px] bg-white border-black border-b-2 border-l-2 border-r-2 rounded-b-lg overflow-auto"
      ref={editorRef}
    ></div>
  );
});
