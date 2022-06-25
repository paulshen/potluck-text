import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { highlightSelectionMatches } from "@codemirror/search";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";

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
          console.log(this.lastUpdate, event, view);
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos === null) {
            return;
          }
          for (const range of view.state.selection.ranges) {
            if (pos >= range.from && pos < range.to) {
              console.log(view.state.sliceDoc(range.from, range.to));
              console.log(view.coordsAtPos(range.from));
            }
          }
          return true;
        }
      },
    },
  }
);

export function App() {
  const editorRef = useRef(null);
  useEffect(() => {
    const view = new EditorView({
      extensions: [
        minimalSetup,
        EditorView.theme({
          "&": { height: "100%" },
        }),
        EditorView.lineWrapping,
        plugin,
      ],
      parent: editorRef.current!,
    });
    return () => {
      view.destroy();
    };
  }, []);
  return (
    <div className="p-8">
      <div className="w-[512px] h-[512px]" ref={editorRef}></div>
    </div>
  );
}
