import { useEffect, useState } from "react";
import { action, runInAction, values } from "mobx";
import { observer } from "mobx-react-lite";
import { nanoid } from "nanoid";
import { CanvasBackground } from "./CanvasBackground";
import {
  SnippetOnCanvas,
  dragNewSnippetEmitter,
  selectedSpatialComponentsMobx,
  Span,
  spatialComponentsMobx,
  SpatialComponentType,
  textEditorStateMobx,
  INGREDIENT_TYPE,
  snippetsMobx,
  snippetTypesMobx,
} from "./primitives";
import { Editor } from "./Editor";
import { Token } from "./Token";
import { SnippetTokenComponent } from "./SnippetTokenComponent";
import { SnippetGroupComponent } from "./SnippetGroupComponent";
import { Pane } from "./Pane";
import { EditorState } from "@codemirror/state";
import { createSnippetFromSpan } from "./utils";

const SpatialComponents = observer(() => {
  return (
    <>
      {spatialComponentsMobx.map((spatialComponent) => {
        switch (spatialComponent.spatialComponentType) {
          case SpatialComponentType.Snippet:
            return (
              <SnippetTokenComponent
                snippetOnCanvas={spatialComponent}
                key={spatialComponent.id}
              ></SnippetTokenComponent>
            );
          case SpatialComponentType.SnippetGroup:
            return (
              <SnippetGroupComponent
                group={spatialComponent}
                key={spatialComponent.id}
              ></SnippetGroupComponent>
            );
        }
      })}
    </>
  );
});

const MULTI_DRAG_SNIPPET_TOKEN_OFFSET = 40;
function NewDragSnippetComponent() {
  const [dragSnippet, setDragSnippet] =
    useState<
      | {
          spanPosition: [x: number, y: number] | undefined;
          span: Span;
          previewTexts: string[];
        }
      | undefined
    >(undefined);

  useEffect(() => {
    let dragSnippetTextId: string | undefined;
    let dragSnippetIds: string[] | undefined;
    let dragNonSnippetTextSpan: Span | undefined;
    let mouseOffset: [x: number, y: number] | undefined;
    let didMouseMove = false;
    function cleanup() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDragSnippet(undefined);
      dragSnippetTextId = undefined;
      dragSnippetIds = undefined;
      dragNonSnippetTextSpan = undefined;
      mouseOffset = undefined;
    }
    function onMouseMove(e: MouseEvent) {
      didMouseMove = true;
      const mouseOffsetSnapshot = mouseOffset!;
      setDragSnippet((dragSnippet) => ({
        ...dragSnippet!,
        spanPosition: [
          e.clientX + mouseOffsetSnapshot[0],
          e.clientY + mouseOffsetSnapshot[1],
        ],
      }));
    }
    function onMouseUp(e: MouseEvent) {
      runInAction(() => {
        let snippetIds = dragSnippetIds;
        if (snippetIds === undefined) {
          snippetIds = [
            createSnippetFromSpan(
              dragSnippetTextId!,
              dragNonSnippetTextSpan!,
              INGREDIENT_TYPE
            ),
          ];
        }
        if (didMouseMove) {
          snippetIds.forEach((snippetId, i) => {
            spatialComponentsMobx.push({
              spatialComponentType: SpatialComponentType.Snippet,
              id: nanoid(),
              snippetId,
              position: [
                e.clientX + mouseOffset![0],
                e.clientY +
                  mouseOffset![1] +
                  i * MULTI_DRAG_SNIPPET_TOKEN_OFFSET,
              ],
            });
          });
        }
      });
      cleanup();
    }
    function onStart({
      snippetId,
      textId,
      spanPosition,
      span,
      mouseOffset: mouseOffsetArg,
      text,
      shiftKey,
      altKey,
    }: {
      snippetId: string | undefined;
      textId: string;
      spanPosition: [x: number, y: number];
      span: Span;
      mouseOffset: [x: number, y: number];
      text: string;
      shiftKey: boolean;
      altKey: boolean;
    }) {
      dragSnippetTextId = textId;
      let previewTexts: string[];
      if (snippetId !== undefined) {
        if (shiftKey || altKey) {
          const snippetTypeId = snippetsMobx.get(snippetId)!.snippetTypeId;
          const snippetsOfTypeInText = values(snippetsMobx).filter(
            (snippet) =>
              snippet.textId === textId &&
              snippet.snippetTypeId === snippetTypeId
          );
          dragSnippetIds = snippetsOfTypeInText.map((snippet) => snippet.id);
          const editorState = textEditorStateMobx.get(textId)!;
          previewTexts = snippetsOfTypeInText.map((snippet) =>
            editorState.sliceDoc(snippet.span[0], snippet.span[1])
          );
        } else {
          dragSnippetIds = snippetId !== undefined ? [snippetId] : [];
          previewTexts = [text];
        }
      } else {
        dragNonSnippetTextSpan = span;
        previewTexts = [text];
      }
      mouseOffset = mouseOffsetArg;
      setDragSnippet({
        // we won't render the preview until user has moved the mouse
        spanPosition: undefined,
        span,
        previewTexts,
      });
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    dragNewSnippetEmitter.addListener("start", onStart);
    return () => {
      dragNewSnippetEmitter.removeListener("start", onStart);
      cleanup();
    };
  }, []);

  if (dragSnippet?.spanPosition === undefined) {
    return null;
  }

  const { spanPosition, previewTexts } = dragSnippet;
  return (
    <div
      className="fixed"
      style={{
        left: `${spanPosition[0]}px`,
        top: `${spanPosition[1]}px`,
      }}
    >
      {previewTexts.map((tokenText, i) => (
        <div
          className="absolute left-0"
          style={{
            top: `${i * MULTI_DRAG_SNIPPET_TOKEN_OFFSET}px`,
          }}
          key={i}
        >
          <Token>{tokenText}</Token>
        </div>
      ))}
    </div>
  );
}

const TEXT_ID = nanoid();

export const App = observer(() => {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Meta") {
        document.querySelector("body")?.classList.add("metakey-down");
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
      <SpatialComponents />
      <NewDragSnippetComponent />
    </div>
  );
});
