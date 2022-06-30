import { Handler, useDrag } from "@use-gesture/react";
import classNames from "classnames";
import { action, computed, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import {
  SnippetGroup,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  dragStateBox,
} from "./primitives";
import { getRectForSnippetGroup } from "./utils";

export const SnippetGroupComponent = observer(
  ({ group }: { group: SnippetGroup }) => {
    const bindDrag = useDrag(
      action<Handler<"drag">>(({ delta, first, event }) => {
        if (first) {
          event.preventDefault();
        }

        if (selectedSpatialComponentsMobx.includes(group.id)) {
          for (const spatialComponent of spatialComponentsMobx) {
            if (selectedSpatialComponentsMobx.includes(spatialComponent.id)) {
              spatialComponent.position = [
                spatialComponent.position[0] + delta[0],
                spatialComponent.position[1] + delta[1],
              ];
            }
          }
        } else {
          group.position[0] = group.position[0] + delta[0];
          group.position[1] = group.position[1] + delta[1];
        }
      })
    );
    const isSelected = computed(() =>
      selectedSpatialComponentsMobx.includes(group.id)
    ).get();

    const rect = getRectForSnippetGroup(group);
    const areSnippetsBeingDraggedOver = computed(
      () => dragStateBox.get()?.snippetsOverGroupId === group.id
    ).get();

    return (
      <div
        className={classNames(
          "absolute touch-none border border-dashed rounded-sm border-zinc-200 p-1 -z-1",
          areSnippetsBeingDraggedOver ? "border-zinc-400" : "border-zinc-200",
          isSelected ? "shadow-lg" : undefined
        )}
        {...bindDrag()}
        style={{
          top: `${rect[1]}px`,
          left: `${rect[0]}px`,
          width: `${rect[2]}px`,
          height: `${rect[3]}px`,
        }}
      ></div>
    );
  }
);
