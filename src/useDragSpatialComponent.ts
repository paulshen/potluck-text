import { useDrag, Handler } from "@use-gesture/react";
import { action } from "mobx";
import {
  SnippetGroup,
  dragStateBox,
  selectedSpatialComponentsMobx,
  SpatialComponent,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitives";
import {
  doesRectContainPosition,
  getPositionForSnippetInGroup,
  getRectForSnippetGroup,
  getRectForSnippetToken,
} from "./utils";

export function useDragSpatialComponent(element: SpatialComponent) {
  return useDrag(
    action<Handler<"drag">>(
      ({ delta, first, last, event, cancel, xy, memo = {} }) => {
        let activeComponents: SpatialComponent[] | undefined =
          memo.activeComponents;
        if (activeComponents === undefined) {
          const parentGroup: SnippetGroup | undefined =
            element.type === SpatialComponentType.Snippet
              ? spatialComponentsMobx.find(
                  (s): s is SnippetGroup =>
                    s.type === SpatialComponentType.SnippetGroup &&
                    s.snippetIds.includes(element.id)
                )
              : undefined;
          if (
            element.type === SpatialComponentType.Snippet &&
            parentGroup !== undefined &&
            event.metaKey
          ) {
            const parentGroupIndex = parentGroup.snippetIds.indexOf(element.id);
            element.position = getPositionForSnippetInGroup(
              parentGroup,
              parentGroupIndex
            );
            const snippetRect = getRectForSnippetToken(element);
            if (!doesRectContainPosition(snippetRect, xy)) {
              // If the token is smaller outside the group, it may not overlap
              // with where the mouse is so nudge the token over to be under mouse.
              element.position[0] =
                element.position[0] +
                (xy[0] - (snippetRect[0] + snippetRect[2])) +
                4;
            }
            parentGroup.snippetIds.splice(parentGroupIndex, 1);
            activeComponents = [element];
          } else {
            const selectionId = (parentGroup ?? element).id;
            if (selectedSpatialComponentsMobx.includes(selectionId)) {
              activeComponents = spatialComponentsMobx.filter((s) =>
                selectedSpatialComponentsMobx.includes(s.id)
              );
            } else {
              activeComponents = [parentGroup ?? element];
            }
          }
          memo.activeComponents = activeComponents;
        }
        if (first) {
          event.preventDefault();
        }
        for (const component of activeComponents) {
          component.position[0] = component.position[0] + delta[0];
          component.position[1] = component.position[1] + delta[1];
        }

        let snippetsDraggingOverGroup: SnippetGroup | undefined;
        if (
          activeComponents.every((c) => c.type === SpatialComponentType.Snippet)
        ) {
          snippetsDraggingOverGroup = spatialComponentsMobx.find(
            (c): c is SnippetGroup =>
              c.type === SpatialComponentType.SnippetGroup &&
              doesRectContainPosition(getRectForSnippetGroup(c), xy)
          );
        }
        if (last) {
          dragStateBox.set(undefined);
          if (snippetsDraggingOverGroup !== undefined) {
            snippetsDraggingOverGroup.snippetIds.push(
              ...activeComponents.map((c) => c.id)
            );
          }
        } else {
          dragStateBox.set({
            spatialComponentIds: activeComponents.map((c) => c.id),
            snippetsOverGroupId: snippetsDraggingOverGroup?.id,
          });
        }
      }
    )
  );
}
