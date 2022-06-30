import { Handler, useDrag } from "@use-gesture/react";
import classNames from "classnames";
import { action, computed, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import {
  SnippetGroup,
  GROUP_TOKEN_GAP,
  GROUP_WIDTH,
  selectedSpatialComponentsMobx,
  TOKEN_HEIGHT,
} from "./primitives";

export const SnippetGroupComponent = observer(
  ({ group }: { group: SnippetGroup }) => {
    const bindDrag = useDrag(
      action<Handler<"drag">>(({ offset, delta, first, event }) => {
        if (first) {
          event.preventDefault();
        }

        group.position = offset;
      }),
      {
        from: () => untracked(() => group.position),
      }
    );
    const isSelected = computed(() =>
      selectedSpatialComponentsMobx.includes(group.id)
    ).get();

    return (
      <div
        className={classNames(
          "absolute touch-none border border-dashed border-zinc-200 p-1",
          isSelected ? "shadow-lg" : undefined
        )}
        {...bindDrag()}
        style={{
          top: `${group.position[1] - 4}px`,
          left: `${group.position[0] - 4}px`,
          width: `${GROUP_WIDTH + 8}px`,
          height: `${
            group.snippetIds.length * TOKEN_HEIGHT +
            (group.snippetIds.length - 1) * GROUP_TOKEN_GAP +
            8
          }px`,
        }}
      ></div>
    );
  }
);
