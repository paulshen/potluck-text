import { useEffect, useRef, useState } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EventEmitter } from "eventemitter3";
import { computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";

type Span = [from: number, to: number];
type DragAnnotation = {
  position: [x: number, y: number];
  span: Span;
};
const editorStateDoc = observable.box<EditorState>();
const annotationsMobx = observable<DragAnnotation>([]);

const AnnotationComponent = observer(
  ({ annotation }: { annotation: DragAnnotation }) => {
    const text = computed(() => {
      return editorStateDoc
        .get()!
        .sliceDoc(annotation.span[0], annotation.span[1]);
    }).get();
    return (
      <div
        className="absolute"
        style={{
          top: `${annotation.position[1]}px`,
          left: `${annotation.position[0]}px`,
        }}
      >
        <div className="relative -top-1 -my-px -left-1 p-1 text-xs font-mono rounded bg-indigo-100 cursor-default">
          {text}
        </div>
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
            key={annotation.span[0]}
          ></AnnotationComponent>
        );
      })}
    </>
  );
});

const dragNewAnnotationEmitter = new EventEmitter();
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
      annotationsMobx.push({
        span: dragAnnotationSpan!,
        position: [e.clientX + mouseOffset![0], e.clientY + mouseOffset![1]],
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
      <div className="relative -top-1 -my-px -left-1 p-1 text-xs font-mono rounded bg-indigo-100 cursor-default">
        {text}
      </div>
    </div>
  );
}

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

export function App() {
  const editorRef = useRef(null);
  useEffect(() => {
    const view = new EditorView({
      extensions: [
        minimalSetup,
        EditorView.theme({
          "&": {
            height: "100%",
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
    <div>
      <div className="p-8">
        <div className="w-[512px] h-[512px]" ref={editorRef}></div>
      </div>
      <AnnotationsComponent />
      <NewDragAnnotationComponent />
    </div>
  );
}
