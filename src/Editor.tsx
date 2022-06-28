import {ViewPlugin, ViewUpdate} from "@codemirror/view";
import {EditorView, minimalSetup} from "codemirror";
import {runInAction} from "mobx";
import {useRef, useEffect} from "react";
import {
  annotationsMobx,
  dragNewAnnotationEmitter,
  editorStateDoc,
} from "./primitives";

const plugin = ViewPlugin.fromClass(
  class {
    lastUpdate: any;

    constructor(view: EditorView) {
    }

    update(update: ViewUpdate) {
      this.lastUpdate = update;
    }

    destroy() {
    }
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
              dragNewAnnotationEmitter.emit("start", {
                spanPosition: [fromPos.left, fromPos.top],
                span: [range.from, range.to],
                mouseOffset: [
                  fromPos.left - event.clientX,
                  fromPos.top - event.clientY,
                ],
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
          for (const annotation of annotationsMobx) {
            annotation.span = [
              transaction.changes.mapPos(annotation.span[0]),
              transaction.changes.mapPos(annotation.span[1]),
            ];
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
