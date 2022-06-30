import { useEffect, useState } from "react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { nanoid } from "nanoid";
import { CanvasBackground } from "./CanvasBackground";
import {
  AnnotationToken,
  dragNewAnnotationEmitter,
  selectedSpatialComponentsMobx,
  Span,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitives";
import { Editor } from "./Editor";
import { Token } from "./Token";
import { AnnotationTokenComponent } from "./AnnotationTokenComponent";
import { AnnotationGroupComponent } from "./AnnotationGroupComponent";

const SpatialComponents = observer(() => {
  return (
    <>
      {spatialComponentsMobx.map((spatialComponent) => {
        switch (spatialComponent.type) {
          case SpatialComponentType.Annotation:
            return (
              <AnnotationTokenComponent
                annotation={spatialComponent}
                key={spatialComponent.id}
              ></AnnotationTokenComponent>
            );
          case SpatialComponentType.AnnotationGroup:
            return (
              <AnnotationGroupComponent
                group={spatialComponent}
                key={spatialComponent.id}
              ></AnnotationGroupComponent>
            );
        }
      })}
    </>
  );
});

function NewDragAnnotationComponent() {
  const [dragAnnotation, setDragAnnotation] = useState<
    | {
        spanPosition: [x: number, y: number];
        span: Span;
        text: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    let dragAnnotationSpan: Span | undefined;
    let mouseOffset: [x: number, y: number] | undefined;
    function cleanup() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDragAnnotation(undefined);
      dragAnnotationSpan = undefined;
      mouseOffset = undefined;
    }
    function onMouseMove(e: MouseEvent) {
      setDragAnnotation((dragAnnotation) => ({
        ...dragAnnotation!,
        spanPosition: [
          e.clientX + mouseOffset![0],
          e.clientY + mouseOffset![1],
        ],
      }));
    }
    function onMouseUp(e: MouseEvent) {
      runInAction(() => {
        spatialComponentsMobx.push({
          type: SpatialComponentType.Annotation,
          id: nanoid(),
          span: dragAnnotationSpan!,
          position: [e.clientX + mouseOffset![0], e.clientY + mouseOffset![1]],
        });
      });
      cleanup();
    }
    function onStart({
      spanPosition,
      span,
      mouseOffset: mouseOffsetArg,
      text,
    }: {
      spanPosition: [x: number, y: number];
      span: Span;
      mouseOffset: [x: number, y: number];
      text: string;
    }) {
      dragAnnotationSpan = span;
      mouseOffset = mouseOffsetArg;
      setDragAnnotation({
        spanPosition,
        span,
        text,
      });
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    dragNewAnnotationEmitter.addListener("start", onStart);
    return () => {
      dragNewAnnotationEmitter.removeListener("start", onStart);
      cleanup();
    };
  }, []);

  if (dragAnnotation === undefined) {
    return null;
  }

  const { spanPosition, span, text } = dragAnnotation;
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

export function App() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target === document.body) {
        switch (e.key) {
          case "g": {
            const selectedTokens: AnnotationToken[] =
              selectedSpatialComponentsMobx
                .flatMap((id) =>
                  spatialComponentsMobx.filter(
                    (spatialComponent): spatialComponent is AnnotationToken =>
                      spatialComponent.id === id &&
                      spatialComponent.type === SpatialComponentType.Annotation
                  )
                )
                .sort((a, b) => a.position[1] - b.position[1]);
            if (selectedTokens.length > 0) {
              spatialComponentsMobx.push({
                type: SpatialComponentType.AnnotationGroup,
                id: nanoid(),
                position: selectedTokens[0].position,
                annotationIds: selectedTokens.map((token) => token.id),
              });
            }
            break;
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
      <div className="p-8 flex">
        <Editor />
      </div>
      <SpatialComponents />
      <NewDragAnnotationComponent />
    </div>
  );
}
