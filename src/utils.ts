import { useDrag, Handler } from "@use-gesture/react";
import { action } from "mobx";
import {
  SnippetGroup,
  GROUP_TOKEN_GAP,
  GROUP_WIDTH,
  Rect,
  TOKEN_HEIGHT,
  Position,
  dragStateBox,
  selectedSpatialComponentsMobx,
  SpatialComponent,
  spatialComponentsMobx,
  SpatialComponentType,
} from "./primitives";

// your favorite dumping ground of utility functions
// ideally this file doesn't have dependencies outside primitives.ts and npm packages

export function doesRectContainPosition(rect: Rect, pos: Position) {
  return (
    pos[0] >= rect[0] &&
    pos[0] <= rect[0] + rect[2] &&
    pos[1] >= rect[1] &&
    pos[1] <= rect[1] + rect[3]
  );
}

export function getRectForSnippetGroup(group: SnippetGroup): Rect {
  return [
    group.position[0] - 4,
    group.position[1] - 4,
    GROUP_WIDTH + 8,
    group.snippetIds.length * TOKEN_HEIGHT +
      (group.snippetIds.length - 1) * GROUP_TOKEN_GAP +
      8,
  ];
}

export function useDragSpatialComponent(element: SpatialComponent) {
  return useDrag(
    action<Handler<"drag">>(
      ({ delta, first, last, event, cancel, xy, memo = {} }) => {
        let activeComponents: SpatialComponent[] | undefined =
          memo.activeComponents;
        if (activeComponents === undefined) {
          const group =
            element.type === SpatialComponentType.Snippet
              ? spatialComponentsMobx.find(
                  (s) =>
                    s.type === SpatialComponentType.SnippetGroup &&
                    s.snippetIds.includes(element.id)
                )
              : undefined;
          const selectionId = (group ?? element).id;
          if (selectedSpatialComponentsMobx.includes(selectionId)) {
            activeComponents = spatialComponentsMobx.filter((s) =>
              selectedSpatialComponentsMobx.includes(s.id)
            );
          } else {
            activeComponents = [group ?? element];
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
