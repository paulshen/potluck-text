import { EditorSelection } from "@codemirror/state";
import {
  Facet,
  SelectionRange,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { autorun, reaction, runInAction } from "mobx";
import { useRef, useEffect } from "react";
import {
  dragNewSnippetEmitter,
  SnippetSuggestion,
  snippetSuggestionsMobx,
  spatialComponentsMobx,
  SpatialComponentType,
  textEditorStateMobx,
} from "./primitives";
import { getSnippetForSnippetOnCanvas } from "./utils";

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

const setSnippetSuggestions = StateEffect.define<SnippetSuggestion[]>();

const snippetSuggestionsField = StateField.define<SnippetSuggestion[]>({
  create() {
    return [];
  },
  update(suggestions, tr) {
    for (let e of tr.effects) {
      if (e.is(setSnippetSuggestions)) {
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
      )
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
            fontFamily: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
            fontSize: "0.85rem",
            lineHeight: "1.25rem",
          },
          ".cm-suggestion": {
            backgroundColor: "#facc1520",
            transition: "background-color 0.2s",
          },
          ".cm-suggestion:hover": {
            backgroundColor: "#facc1580",
          },
        }),
        EditorView.lineWrapping,
        textIdFacet.of(textId),
        dragSnippetPlugin,
        snippetSuggestionsField,
        suggestionDecorations,
      ],
      parent: editorRef.current!,
      dispatch(transaction) {
        view.update([transaction]);
        runInAction(() => {
          for (const spatialComponent of spatialComponentsMobx) {
            switch (spatialComponent.spatialComponentType) {
              case SpatialComponentType.Snippet: {
                const snippet = getSnippetForSnippetOnCanvas(spatialComponent);
                if (snippet.textId === textId) {
                  snippet.span = [
                    transaction.changes.mapPos(snippet.span[0]),
                    transaction.changes.mapPos(snippet.span[1]),
                  ];
                }
                break;
              }
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
            setSnippetSuggestions.of(snippetSuggestionsMobx.get(textId) ?? []),
          ],
        });
      }),
    ];
    return () => {
      view.destroy();
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return (
    <div
      className="text-lg max-w-[480px] h-[480px] bg-white border-black border-b-2 border-l-2 border-r-2 rounded-b-lg overflow-auto"
      ref={editorRef}
    ></div>
  );
}
