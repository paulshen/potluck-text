import { useEffect, useState } from "react";
import { action, computed, observable, runInAction, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import { Handler, useDrag } from "@use-gesture/react";
import { nanoid } from "nanoid";
import { CanvasBackground } from "./CanvasBackground";
import {
  annotationsMobx,
  AnnotationType,
  DragAnnotation,
  dragNewAnnotationEmitter,
  editorStateDoc,
  selectedAnnotationsMobx,
  Span,
} from "./primitives";
import classNames from "classnames";
import { Editor } from "./Editor";

function Token({
  isSelected = false,
  annotationType,
  children,
}: {
  isSelected?: boolean;
  annotationType?: AnnotationType | undefined;
  children: React.ReactNode;
}) {
  return (
    <div
      className={classNames(
        "relative -top-1 -my-px -left-2 px-2 py-1 text-xs font-mono rounded cursor-default whitespace-nowrap",
        annotationType !== undefined ? "text-white" : undefined,
        isSelected ? "shadow-lg bg-opacity-100" : "bg-opacity-80",
        annotationType === AnnotationType.Ingredient
          ? "bg-indigo-600"
          : annotationType === AnnotationType.Duration
          ? "bg-orange-600"
          : "bg-zinc-300"
      )}
    >
      {children}
    </div>
  );
}

const AnnotationComponent = observer(
  ({ annotation }: { annotation: DragAnnotation }) => {
    const text = computed(() => {
      return editorStateDoc
        .get()!
        .sliceDoc(annotation.span[0], annotation.span[1]);
    }).get();
    const isSelected = computed(() =>
      selectedAnnotationsMobx.includes(annotation.id)
    ).get();

    const bindDrag = useDrag(
      action<Handler<"drag">>(({ offset, delta, first, event }) => {
        if (first) {
          event.preventDefault();
        }
        if (selectedAnnotationsMobx.includes(annotation.id)) {
          for (const a of annotationsMobx) {
            if (selectedAnnotationsMobx.includes(a.id)) {
              a.position = [a.position[0] + delta[0], a.position[1] + delta[1]];
            }
          }
        } else {
          annotation.position = offset;
        }
      }),
      {
        from: () => untracked(() => annotation.position),
      }
    );

    return (
      <div
        {...bindDrag()}
        className="absolute touch-none"
        style={{
          top: `${annotation.position[1]}px`,
          left: `${annotation.position[0]}px`,
        }}
      >
        <Token isSelected={isSelected} annotationType={annotation.type}>
          {text}
        </Token>
      </div>
    );
  }
);
const AnnotationsComponent = observer(() => {
  return (
    <>
      {annotationsMobx.map((annotation) => {
        return (
          <AnnotationComponent
            annotation={annotation}
            key={annotation.id}
          ></AnnotationComponent>
        );
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
        annotationsMobx.push({
          id: nanoid(),
          span: dragAnnotationSpan!,
          position: [e.clientX + mouseOffset![0], e.clientY + mouseOffset![1]],
          type: undefined,
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
          case "1":
          case "2": {
            runInAction(() => {
              annotationsMobx.forEach((annotation) => {
                if (selectedAnnotationsMobx.includes(annotation.id)) {
                  annotation.type =
                    e.key === "1"
                      ? AnnotationType.Ingredient
                      : AnnotationType.Duration;
                }
              });
            });
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
      <AnnotationsComponent />
      <NewDragAnnotationComponent />
    </div>
  );
}
