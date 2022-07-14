import { useEffect, useState } from "react";
import { action, runInAction, values } from "mobx";
import { observer } from "mobx-react-lite";
import { nanoid } from "nanoid";
import { CanvasBackground } from "./CanvasBackground";
import { textEditorStateMobx } from "./primitives";
import { Editor } from "./Editor";
import { Pane } from "./Pane";
import { EditorState } from "@codemirror/state";
import {
  selectedSpatialComponentsMobx,
  SnippetOnCanvas,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitivesOld";

export const App = observer(() => {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Meta") {
        document.querySelector("body")?.classList.add("metakey-down");
      }
      if (e.key === "Shift") {
        document.querySelector("body")?.classList.add("shiftkey-down");
      }

      runInAction(() => {
        if (e.target === document.body) {
          switch (e.key) {
            case "g": {
              const selectedTokens: SnippetOnCanvas[] =
                selectedSpatialComponentsMobx
                  .flatMap((id) =>
                    spatialComponentsMobx.filter(
                      (spatialComponent): spatialComponent is SnippetOnCanvas =>
                        spatialComponent.id === id &&
                        spatialComponent.spatialComponentType ===
                          SpatialComponentType.Snippet
                    )
                  )
                  .sort((a, b) => a.position[1] - b.position[1]);
              if (selectedTokens.length > 0) {
                spatialComponentsMobx.push({
                  spatialComponentType: SpatialComponentType.SnippetGroup,
                  id: nanoid(),
                  position: selectedTokens[0].position,
                  snippetIds: selectedTokens.map((token) => token.id),
                  extraColumns: [],
                });
              }
              break;
            }
            case "Backspace":
            case "Delete": {
              for (const componentId of selectedSpatialComponentsMobx) {
                const component = spatialComponentsMobx.find(
                  (c) => c.id === componentId
                );
                if (component !== undefined) {
                  spatialComponentsMobx.remove(component);
                }
              }
            }
          }
        }
      });
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Meta") {
        document.querySelector("body")?.classList.remove("metakey-down");
      }
      if (e.key === "Shift") {
        document.querySelector("body")?.classList.remove("shiftkey-down");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div>
      <CanvasBackground />
      <button
        onClick={action(() => {
          textEditorStateMobx.set(
            nanoid(),
            EditorState.create({
              doc: "",
            })
          );
        })}
        className="absolute top-4 right-4 font-mono text-xs"
      >
        add textarea
      </button>
      <div className="absolute z-0">
        {[...textEditorStateMobx.keys()].map((textId) => {
          return (
            <Pane key={textId}>
              <Editor textId={textId} />
            </Pane>
          );
        })}
      </div>
    </div>
  );
});
