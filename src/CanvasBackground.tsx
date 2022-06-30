import { Handler, useDrag } from "@use-gesture/react";
import { action, runInAction } from "mobx";
import { useState } from "react";
import {
  CHAR_WIDTH,
  editorStateDoc,
  Rect,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitives";

function doesRectContain(rect: Rect, [x, y]: [x: number, y: number]) {
  return (
    x >= rect[0] &&
    x < rect[0] + rect[2] &&
    y >= rect[1] &&
    y < rect[1] + rect[3]
  );
}

function doRectsOverlap(r1: Rect, r2: Rect): boolean {
  if (r1[0] > r2[0] + r2[2] || r2[0] > r1[0] + r1[2]) {
    return false;
  }
  if (r1[1] > r2[1] + r2[3] || r2[1] > r1[1] + r1[3]) {
    return false;
  }
  return true;
}

export function CanvasBackground() {
  const [selectionRect, setSelectionRect] = useState<Rect | undefined>(
    undefined
  );
  const bindDrag = useDrag(
    action<Handler<"drag">>(({ initial, first, last, movement }) => {
      if (first) {
        selectedSpatialComponentsMobx.clear();
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
        selectedSpatialComponentsMobx.replace(
          spatialComponentsMobx
            .filter((spatialComponent) => {
              let rect: Rect;
              switch (spatialComponent.type) {
                case SpatialComponentType.Snippet: {
                  const text = editorStateDoc
                    .get()!
                    .sliceDoc(
                      spatialComponent.span[0],
                      spatialComponent.span[1]
                    );
                  rect = [
                    spatialComponent.position[0] - 8,
                    spatialComponent.position[1] - 4,
                    text.length * CHAR_WIDTH + 16,
                    24,
                  ];
                  break;
                }
                case SpatialComponentType.SnippetGroup: {
                  // TODO:
                  rect = [0, 0, 0, 0];
                }
              }
              return doRectsOverlap(selectionRect, rect);
            })
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
