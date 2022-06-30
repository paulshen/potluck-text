import classNames from "classnames";
import { computed } from "mobx";
import { observer } from "mobx-react-lite";
import {
  SnippetGroup,
  selectedSpatialComponentsMobx,
  dragStateBox,
} from "./primitives";
import { getRectForSnippetGroup } from "./utils";
import { useDragSpatialComponent } from "./useDragSpatialComponent";

export const SnippetGroupComponent = observer(
  ({ group }: { group: SnippetGroup }) => {
    const bindDrag = useDragSpatialComponent(group);
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
