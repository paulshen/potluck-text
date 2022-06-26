import { Handler, useDrag } from "@use-gesture/react";
import { action, runInAction } from "mobx";
import { useState } from "react";
import { annotationsMobx, Rect, selectedAnnotationsMobx } from "./State";

function doesRectContain(rect: Rect, [x, y]: [x: number, y: number]) {
  return (
    x >= rect[0] &&
    x < rect[0] + rect[2] &&
    y >= rect[1] &&
    y < rect[1] + rect[3]
  );
}

export function CanvasBackground() {
  const [selectionRect, setSelectionRect] = useState<Rect | undefined>(
    undefined
  );
  const bindDrag = useDrag(
    action<Handler<"drag">>(({ initial, first, last, movement }) => {
      if (first) {
        selectedAnnotationsMobx.clear();
      } else if (last) {
        setSelectionRect(undefined);
      } else {
        let x = initial[0] + (movement[0] < 0 ? movement[0] : 0);
        let y = initial[1] + (movement[1] < 0 ? movement[1] : 0);
        const selectionRect: Rect = [
          x,
          y,
          Math.abs(movement[0]),
          Math.abs(movement[1]),
        ];
        setSelectionRect(selectionRect);
        selectedAnnotationsMobx.replace(
          annotationsMobx
            .filter((annotation) =>
              doesRectContain(selectionRect, annotation.position)
            )
            .map((a) => a.id)
        );
      }
    })
  );
  return (
    <>
      <div
        {...bindDrag()}
        className="fixed top-0 left-0 bottom-0 right-0 touch-none"
      />
      {selectionRect !== undefined ? (
        <div
          className="fixed bg-blue-100 opacity-50"
          style={{
            left: `${selectionRect[0]}px`,
            top: `${selectionRect[1]}px`,
            width: `${selectionRect[2]}px`,
            height: `${selectionRect[3]}px`,
          }}
        />
      ) : null}
    </>
  );
}
