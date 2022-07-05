import { Facet, StateEffect, StateField } from "@codemirror/state";
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
          for (const range of view.state.selection.ranges) {
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
          },
          "&.cm-editor.cm-focused": {
            outline: "none",
          },
          ".cm-scroller": {
            fontFamily: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
            fontSize: "0.75rem",
            lineHeight: "1rem",
          },
          ".cm-suggestion": {
            backgroundColor: "#facc1540",
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
            switch (spatialComponent.type) {
              case SpatialComponentType.Snippet: {
                if (spatialComponent.textId === textId) {
                  spatialComponent.span = [
                    transaction.changes.mapPos(spatialComponent.span[0]),
                    transaction.changes.mapPos(spatialComponent.span[1]),
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
      className="w-[384px] h-[320px] bg-white border border-zinc-200 overflow-auto"
      ref={editorRef}
    ></div>
  );
}
