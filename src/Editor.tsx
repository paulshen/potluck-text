import {
  Facet,
  SelectionRange,
  EditorSelection,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  ViewPlugin,
  ViewUpdate,
  Decoration,
  WidgetType,
} from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { autorun, comparer, reaction, runInAction } from "mobx";
import { useRef, useEffect } from "react";
import {
  dragNewSnippetEmitter,
  snippetsMobx,
  Snippet,
  SnippetSuggestion,
  snippetSuggestionsMobx,
  textEditorStateMobx,
  snippetEditorAnnotationsMobx,
} from "./primitives";

const textIdFacet = Facet.define<string, string>({
  combine: (values) => values[0],
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
          const suggestionsAsRanges: SelectionRange[] =
            // @ts-ignore - The field is there because the plugin adds it.
            view.state.field(snippetSuggestionsField).map((suggestion) => {
              const [from, to] = suggestion.span;
              return EditorSelection.range(from, to);
            });
          const possibleDragRanges =
            view.state.selection.ranges.concat(suggestionsAsRanges);
          for (const range of possibleDragRanges) {
            if (pos >= range.from && pos < range.to) {
              const fromPos = view.coordsAtPos(range.from)!;
              const left = fromPos.left - 8;
              const top = fromPos.top - 5;
              dragNewSnippetEmitter.emit("start", {
                textId: view.state.facet(textIdFacet),
                spanPosition: [left, top],
                span: [range.from, range.to],
                mouseOffset: [left - event.clientX, top - event.clientY],
                text: view.state.sliceDoc(range.from, range.to),
              });
              // We only want to drag out a single snippet
              break;
            }
          }
          return true;
        }
      },
    },
  }
);

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
const suggestionDecorations = EditorView.decorations.from(
  snippetSuggestionsField,
  (suggestions) =>
    Decoration.set(
      suggestions.map((suggestion) =>
        suggestionMark.range(suggestion.span[0], suggestion.span[1])
      ),
      true
    )
);

type SnippetWithAnnotation = Snippet & {
  annotations: { key: string; value: string }[];
};
const setSnippetsEffect = StateEffect.define<SnippetWithAnnotation[]>();
const snippetsField = StateField.define<SnippetWithAnnotation[]>({
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
});

const ANNOTATION_COLOR: Record<string, string> = {
  Aisle: "bg-green-100",
};

class SnippetAnnotationsWidget extends WidgetType {
  constructor(readonly annotations: { key: string; value: string }[]) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof SnippetAnnotationsWidget &&
      comparer.structural(this.annotations, other.annotations)
    );
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "rounded-r";
    wrap.setAttribute("aria-hidden", "true");
    for (const { key, value } of this.annotations) {
      const token = document.createElement("span");
      token.className = `${
        ANNOTATION_COLOR[key] ?? "bg-blue-100"
      } px-1 text-gray-800 font-mono text-sm`;
      token.innerText = value;
      wrap.appendChild(token);
    }
    return wrap;
  }
}

const snippetDecorations = EditorView.decorations.from(
  snippetsField,
  (snippets) =>
    Decoration.set(
      snippets.flatMap((snippet) => [
        Decoration.mark({ class: "cm-snippet" }).range(
          snippet.span[0],
          snippet.span[1]
        ),
        Decoration.widget({
          widget: new SnippetAnnotationsWidget(snippet.annotations),
          side: 1,
        }).range(snippet.span[1]),
      ]),
      true
    )
);

export function Editor({ textId }: { textId: string }) {
  const editorRef = useRef(null);
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
            lineHeight: "1.35rem",
          },
          ".cm-suggestion": {
            textDecoration: "underline",
            textDecorationColor: "#aaaaaa",
            textDecorationStyle: "dashed",
            transition: "background-color 0.2s",
          },
          ".cm-suggestion:hover": {
            backgroundColor: "#facc1580",
          },
          ".cm-snippet": {
            backgroundColor: "#80808015",
            padding: "0 0.3rem",
          },
          ".cm-snippet .cm-suggestion": {
            backgroundColor: "#80808015",
          },
        }),
        EditorView.lineWrapping,
        textIdFacet.of(textId),
        dragSnippetPlugin,
        snippetSuggestionsField,
        suggestionDecorations,
        snippetsField,
        snippetDecorations,
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
          const snippetSuggestions = snippetSuggestionsMobx.get(textId);
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
    runInAction(() => {
      textEditorStateMobx.set(textId, view.state);
    });
    const unsubscribes: (() => void)[] = [
      autorun(() => {
        view.dispatch({
          effects: [
            setSnippetSuggestionsEffect.of(
              snippetSuggestionsMobx.get(textId) ?? []
            ),
          ],
        });
      }),
      reaction(
        () =>
          [...snippetsMobx.values()]
            .filter((snippet) => snippet.textId === textId)
            .map((snippet) => ({
              ...snippet,
              annotations: snippetEditorAnnotationsMobx.get(snippet.id) ?? [],
            })),
        (snippetsWithAnnotations) => {
          view.dispatch({
            effects: [setSnippetsEffect.of(snippetsWithAnnotations)],
          });
        },
        { equals: comparer.structural }
      ),
    ];
    return () => {
      view.destroy();
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return (
    <div
      className="text-lg h-[480px] bg-white border-black border-b-2 border-l-2 border-r-2 rounded-b-lg overflow-auto"
      ref={editorRef}
    ></div>
  );
}
