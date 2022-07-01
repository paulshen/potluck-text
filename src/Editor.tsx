import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { runInAction } from "mobx";
import { useRef, useEffect } from "react";
import {
  dragNewSnippetEmitter,
  editorStateDoc,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitives";

const DEFAULT_EDITOR_CONTENT = `# Chili

Bring 2 pounds low fat (~90/10) ground chuck beef to room temperature, and season with 1 Tbsp onion powder, 2 tsp salt, and 3/8 tsp garlic powder.

Warm bacon fat or cooking oil in large pot over high heat, and add seasoned meat. Break meat into small pieces, and stir until meat is browned and liquid becomes gravy-like.

Add 12oz ipa beer or hop water, 8oz can tomato sauce/puree, 3 Tbl ground ancho chili powder, 1 tsp ground cumin, 1 tsp paprika, 1 tsp unsweetened cocoa powder, 1/4 tsp dried oregano, 1/4 tsp ground cayenne pepper, and 1/8 tsp ground cinnamon to meat mixture, and simmer over low heat for 2-3 hours, stirring regularly.

Add 1/8 Cup diced poblano peppers to mixture, and continue to simmer for 2 hours, stirring regularly.

Optionally rinse 1 can red kidney beans and 1 can black beans with water and drain. Gently stir beans into mixture, keeping the beans intact.

Simmer on low until liquid as evaporated. Chili is ready once flavors are blended and texture is to your liking.

Serve in bowl and garnish to taste with grated cheddar, avocado, sour cream, jalapeño, salsa, tortilla chips, Fritos, or corn bread.
`;

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
      doc: DEFAULT_EDITOR_CONTENT,
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
              case SpatialComponentType.Snippet: {
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
      className="text-lg max-w-[480px] h-[384px] border-black rounded-lg border-2 overflow-auto p-2"
      ref={editorRef}
    ></div>
  );
}
