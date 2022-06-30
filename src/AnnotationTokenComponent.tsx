import { useDrag, Handler } from "@use-gesture/react";
import classNames from "classnames";
import { computed, action, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import {
  AnnotationGroup,
  AnnotationToken,
  editorStateDoc,
  GROUP_TOKEN_GAP,
  GROUP_WIDTH,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  SpatialComponentType,
  TOKEN_HEIGHT,
} from "./primitives";
import { Token } from "./Token";

export const AnnotationTokenComponent = observer(
  ({ annotation }: { annotation: AnnotationToken }) => {
    const text = computed(() => {
      return editorStateDoc
        .get()!
        .sliceDoc(annotation.span[0], annotation.span[1]);
    }).get();
    // @ts-ignore
    const annotationGroup: AnnotationGroup | undefined = computed(() =>
      spatialComponentsMobx.find(
        (spatialComponent) =>
          spatialComponent.type === SpatialComponentType.AnnotationGroup &&
          spatialComponent.annotationIds.includes(annotation.id)
      )
    ).get();
    const isSelected = computed(
      () =>
        annotationGroup === undefined &&
        selectedSpatialComponentsMobx.includes(annotation.id)
    ).get();

    const bindDrag = useDrag(
      action<Handler<"drag">>(({ offset, delta, first, event, cancel }) => {
        if (first) {
          event.preventDefault();
          if (annotationGroup !== undefined) {
            cancel();
            return;
          }
        }
        if (selectedSpatialComponentsMobx.includes(annotation.id)) {
          for (const spatialComponent of spatialComponentsMobx) {
            if (selectedSpatialComponentsMobx.includes(spatialComponent.id)) {
              spatialComponent.position = [
                spatialComponent.position[0] + delta[0],
                spatialComponent.position[1] + delta[1],
              ];
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

    let top;
    let left;
    if (annotationGroup !== undefined) {
      const index = annotationGroup.annotationIds.indexOf(annotation.id);
      left = annotationGroup.position[0];
      top =
        annotationGroup.position[1] +
        index * TOKEN_HEIGHT +
        index * GROUP_TOKEN_GAP;
    } else {
      left = annotation.position[0];
      top = annotation.position[1];
    }

    return (
      <div
        {...bindDrag()}
        className={classNames(
          "absolute touch-none",
          annotationGroup !== undefined ? "-z-1" : undefined
        )}
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: annotationGroup !== undefined ? `${GROUP_WIDTH}px` : undefined,
        }}
      >
        <Token isSelected={isSelected}>{text}</Token>
      </div>
    );
  }
);
