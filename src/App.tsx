import { useEffect, useState } from "react";
import { action, runInAction } from "mobx";
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
  SnippetSuggestion,
  snippetTypesMobx,
  snippetSuggestionsMobx,
} from "./primitives";
import { Editor } from "./Editor";
import { Token } from "./Token";
import { SnippetTokenComponent } from "./SnippetTokenComponent";
import { SnippetGroupComponent } from "./SnippetGroupComponent";
import { Pane } from "./Pane";
import { EditorState } from "@codemirror/state";
import { createSnippetsOnCanvasForSuggestions } from "./utils";
import "./ShenIntegrationFile";

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

function NewDragSnippetComponent() {
  const [dragSnippet, setDragSnippet] = useState<
    | {
        spanPosition: [x: number, y: number];
        span: Span;
        text: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    let dragSnippetSpan: [textId: string, span: Span] | undefined;
    let mouseOffset: [x: number, y: number] | undefined;
    function cleanup() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDragSnippet(undefined);
      dragSnippetSpan = undefined;
      mouseOffset = undefined;
    }
    function onMouseMove(e: MouseEvent) {
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
        const snippetId = nanoid();
        snippetsMobx.set(snippetId, {
          id: snippetId,
          snippetTypeId: INGREDIENT_TYPE,
          textId: dragSnippetSpan![0],
          span: dragSnippetSpan![1],
          data: {},
        });
        spatialComponentsMobx.push({
          spatialComponentType: SpatialComponentType.Snippet,
          id: nanoid(),
          snippetId,
          position: [e.clientX + mouseOffset![0], e.clientY + mouseOffset![1]],
        });
      });
      cleanup();
    }
    function onStart({
      textId,
      spanPosition,
      span,
      mouseOffset: mouseOffsetArg,
      text,
    }: {
      textId: string;
      spanPosition: [x: number, y: number];
      span: Span;
      mouseOffset: [x: number, y: number];
      text: string;
    }) {
      dragSnippetSpan = [textId, span];
      mouseOffset = mouseOffsetArg;
      setDragSnippet({
        spanPosition,
        span,
        text,
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

  if (dragSnippet === undefined) {
    return null;
  }

  const { spanPosition, span, text } = dragSnippet;
  return (
    <div
      className="fixed"
      style={{
        left: `${spanPosition[0]}px`,
        top: `${spanPosition[1]}px`,
      }}
    >
      <Token>{text}</Token>
    </div>
  );
}

const TEXT_ID = nanoid();

export const App = observer(() => {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
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
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
          const numSuggestions =
            snippetSuggestionsMobx.get(textId)?.length ?? 0;
          return (
            <Pane key={textId}>
              <Editor textId={textId} />
              {numSuggestions > 0 && (
                <button
                  className="text-sm text-gray-400"
                  onClick={() => {
                    createSnippetsOnCanvasForSuggestions(
                      textId,
                      snippetSuggestionsMobx.get(textId) ?? []
                    );
                  }}
                >
                  Create {numSuggestions} suggested snippets
                </button>
              )}
            </Pane>
          );
        })}
      </div>
      <SpatialComponents />
      <NewDragSnippetComponent />
    </div>
  );
});
