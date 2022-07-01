import { Facet } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { runInAction } from "mobx";
import { useRef, useEffect } from "react";
import {
  dragNewSnippetEmitter,
  spatialComponentsMobx,
  SpatialComponentType,
  textEditorStateMobx,
} from "./primitives";

const textIdFacet = Facet.define<string, string>({
  combine: (values) => values[0],
});

const plugin = ViewPlugin.fromClass(
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
        }),
        EditorView.lineWrapping,
        textIdFacet.of(textId),
        plugin,
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
          textEditorStateMobx.set(textId, transaction.state);
        });
      },
    });
    runInAction(() => {
      textEditorStateMobx.set(textId, view.state);
    });
    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div
      className="w-[384px] h-[320px] bg-white border border-zinc-200 overflow-auto"
      ref={editorRef}
    ></div>
  );
}
