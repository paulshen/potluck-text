import {useEffect, useState} from "react";
import {action, computed, observable, runInAction, untracked} from "mobx";
import {observer} from "mobx-react-lite";
import {Handler, useDrag} from "@use-gesture/react";
import {nanoid} from "nanoid";
import {CanvasBackground} from "./CanvasBackground";
import {
  Annotation,
  annotationsMobx,
  AnnotationType,
  DragAnnotation,
  dragNewAnnotationEmitter, DragStack,
  editorStateDoc,
  selectedAnnotationsMobx,
  Span, stacksMobx,
} from "./primitives";
import classNames from "classnames";
import {Editor} from "./Editor";

function Token({
  isSelected = false,
  disableShift = false,
  annotationType,
  children,
}: {
  isSelected?: boolean;
  annotationType?: AnnotationType | undefined;
  children: React.ReactNode;
  disableShift?: boolean
}) {
  return (
    <div
      className={classNames(
        "relative px-2 py-1 text-xs font-mono rounded cursor-default whitespace-nowrap",
        annotationType !== undefined ? "text-white" : undefined,
        isSelected ? "shadow-lg bg-opacity-100" : "bg-opacity-100",
        annotationType === AnnotationType.Ingredient
          ? "bg-indigo-600"
          : annotationType === AnnotationType.Duration
            ? "bg-orange-600"
            : "bg-zinc-300",
        disableShift ? "" : "-top-1 -my-px -left-2"
      )}
    >
      {children}
    </div>
  );
}

const DragAnnotationComponent = observer(
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
          <DragAnnotationComponent
            annotation={annotation}
            key={annotation.id}
          />
        );
      })}
    </>
  );
});

const StackAnnotationComponent = observer(({ annotation }: { annotation: Annotation }) => {
  const text = computed(() => {
    return editorStateDoc
      .get()!
      .sliceDoc(annotation.span[0], annotation.span[1]);
  }).get();

  return (
    <Token disableShift={true} annotationType={annotation.type}>
      {text}
    </Token>
  )
})

const ITEM_HEIGHT = 28;

const X_DISTANCE = 210;
const X_TOLERANCE = 10;
const Y_TOLERANCE = 50;

type Join = {
  stack: DragStack
  offsetByIndex: { [index: number]: number }
  height: number
}

function getAnnotationText(annotation: Annotation): string {
  return editorStateDoc
    .get()!
    .sliceDoc(annotation.span[0], annotation.span[1]);
}

function findJoin(stack: DragStack): Join | undefined {

  const matchingStack = stacksMobx.find((other) => {
    return (
      other.id !== stack.id &&
      Math.abs(other.position[1] - stack.position[1]) < X_TOLERANCE &&
      Math.abs(stack.position[0] - (X_DISTANCE + other.position[0])) < Y_TOLERANCE
    )
  })

  if (matchingStack) {
    let offset = 0;
    const offsetByIndex: { [index: number]: number } = {}


    for (const matchingAnnotation of matchingStack.annotations) {
      const matchingText = getAnnotationText(matchingAnnotation).toLowerCase()

      let hasMatches = false;

      stack.annotations.forEach((annotation, index) => {
        if (getAnnotationText(annotation).toLowerCase().includes(matchingText)) {
          hasMatches = true
          offsetByIndex[index] = offset
          offset += 1;
        }
      })

      if (!hasMatches) {
        offset += 1;
      }
    }

    return {
      stack: matchingStack,
      offsetByIndex,
      height: offset
    }
  }
}

const StackComponent = observer(({ stack }: { stack: DragStack }) => {

  const join = findJoin(stack)

  const bindDrag = useDrag(
    action<Handler<"drag">>(({ offset, delta, first, event }) => {
      if (first) {
        event.preventDefault();
      }

      stack.position = offset;
    }),
    {
      from: () => untracked(() => stack.position),
    }
  );

  const isExpanded = true // stack.isExpanded

  return (
    <>
      {join && (
        <div
          className="absolute icon icon-link bg-gray-300"
          style={{
            top: `${(stack.position[1] + join.stack.position[1]) / 2 + 20}px`,
            left: `${join.stack.position[0] + X_DISTANCE}px`
          }}
        >
        </div>
      )}
      <div
        className="absolute touch-none flex flex-col items-center"
        {...bindDrag()}
        style={{
          top: `${stack.position[1]}px`,
          left: `${stack.position[0]}px`
        }}>

        <div
          className="flex flex-col gap-1 border border-zinc-200 p-1 rounded border-dashed relative"
          style={{
            width: '200px',
            height: (
              join
                ? (join.height * ITEM_HEIGHT + 8)
                : (isExpanded ? 'inherit' : `${ITEM_HEIGHT}px`)
            )
          }}
        >
          {stack.annotations.map((annotation, index) => {

            const annotationComponent = <StackAnnotationComponent annotation={annotation}/>

            if (join) {
              const offset = join.offsetByIndex[index]

              if (offset === undefined) {
                return null
              }

              return (
                <div
                  className="absolute"
                  style={{
                    top: `${offset * ITEM_HEIGHT + 4}px`,
                    left: '4px'
                  }}
                >
                  {annotationComponent}
                </div>
              )
            }

            return annotationComponent
          })}
        </div>

        {false && <button
          onClick={() => {
            runInAction(() => {
              stack.isExpanded = !isExpanded
            })
          }}
          className={classNames("icon icon-expandable bg-gray-300", {
            "is-expanded": stack.isExpanded
          })}/>}

      </div>
    </>
  )
})

const StacksComponent = observer(() => {
  return (
    <>
      {stacksMobx.map((stack, index) => {
        return (
          <StackComponent
            stack={stack}
            key={index}
          />
        )
      })}
    </>
  )
})

function NewDragAnnotationComponent() {
  const [dragAnnotation, setDragAnnotation] = useState<| {
    spanPosition: [x: number, y: number];
    span: Span;
    text: string;
  }
    | undefined>(undefined);

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
          case "s":
            runInAction(() => {

              const stackAnnotations: Annotation[] = []

              let minAnnotation: DragAnnotation | undefined;

              const filteredAnnotations = annotationsMobx.filter((annotation) => {
                const isSelected = selectedAnnotationsMobx.includes(annotation.id)

                if (isSelected) {

                  if (!minAnnotation || (minAnnotation.position[1] > annotation.position[1])) {
                    minAnnotation = annotation
                  }

                  stackAnnotations.push(annotation)
                }

                return !isSelected
              })

              annotationsMobx.replace(filteredAnnotations)

              if (minAnnotation) {
                stacksMobx.push({
                  id: nanoid(),
                  isExpanded: false,
                  position: [...minAnnotation.position],
                  annotations: stackAnnotations
                })
              }
            })
            break;

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
      <CanvasBackground/>
      <div className="p-8 flex">
        <Editor/>
      </div>
      <AnnotationsComponent/>
      <NewDragAnnotationComponent/>
      <StacksComponent/>
    </div>
  );
}
