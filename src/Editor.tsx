import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { runInAction } from "mobx";
import { useRef, useEffect } from "react";
import {
  dragNewAnnotationEmitter,
  editorStateDoc,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitives";

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
              dragNewAnnotationEmitter.emit("start", {
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

export function Editor() {
  const editorRef = useRef(null);
  useEffect(() => {
    const view = new EditorView({
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
        plugin,
      ],
      parent: editorRef.current!,
      dispatch(transaction) {
        view.update([transaction]);
        runInAction(() => {
          for (const spatialComponent of spatialComponentsMobx) {
            switch (spatialComponent.type) {
              case SpatialComponentType.Annotation: {
                spatialComponent.span = [
                  transaction.changes.mapPos(spatialComponent.span[0]),
                  transaction.changes.mapPos(spatialComponent.span[1]),
                ];
                break;
              }
            }
          }
          editorStateDoc.set(transaction.state);
        });
      },
    });
    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div
      className="w-[384px] h-[384px] border border-zinc-200 overflow-auto"
      ref={editorRef}
    ></div>
  );
}
