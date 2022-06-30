import classNames from "classnames";
import { action, computed, runInAction, set, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import { nanoid } from "nanoid";
import { useState } from "react";
import { formulaIsValid } from "./formulas";
import {
  SnippetGroup,
  selectedSpatialComponentsMobx,
  dragStateBox,
  spatialComponentsMobx,
  GROUP_COLUMN_WIDTH,
  getGroupWidth,
} from "./primitives";
import { getRectForSnippetGroup } from "./utils";
import { useDragSpatialComponent } from "./useDragSpatialComponent";

export const SnippetGroupComponent = observer(
  ({ group }: { group: SnippetGroup }) => {
    const bindDrag = useDragSpatialComponent(group);
    const [currentlyConfiguringColumn, setCurrentlyConfiguringColumn] =
      useState<string>();
    const isSelected = computed(() =>
      selectedSpatialComponentsMobx.includes(group.id)
    ).get();

    const rect = getRectForSnippetGroup(group);
    const areSnippetsBeingDraggedOver = computed(
      () => dragStateBox.get()?.snippetsOverGroupId === group.id
    ).get();

    return (
      <>
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
        <button
          className={classNames("absolute touch-none text-gray-300")}
          style={{
            top: `${group.position[1] - 4}px`,
            left: `${group.position[0] - 4 + getGroupWidth(group) + 16}px`,
          }}
          onClick={() =>
            group.extraColumns.push({ id: nanoid(), name: "New Column" })
          }
        >
          +
        </button>
        {group.extraColumns.map((column, index) => {
          const configuringColumn = currentlyConfiguringColumn === column.id;
          return (
            <div
              className={classNames(
                "absolute touch-none text-gray-400 text-xs"
              )}
              style={{
                top: `${group.position[1] - 20}px`,
                left: `${
                  group.position[0] + (index + 1) * GROUP_COLUMN_WIDTH + 4
                }px`,
              }}
            >
              <input
                className={classNames("border-none")}
                onChange={(e) =>
                  runInAction(() => (column.name = e.target.value))
                }
                value={column.name}
              ></input>
              <button
                onClick={() => {
                  if (configuringColumn) {
                    setCurrentlyConfiguringColumn(undefined);
                  } else {
                    setCurrentlyConfiguringColumn(column.id);
                  }
                }}
              >
                {configuringColumn ? "done" : "️⚙"}
              </button>
              {configuringColumn && (
                <div
                  className={classNames(
                    "absolute bg-zinc-50 h-8 w-64 shadow-md p-2 text-gray-700 -top-10"
                  )}
                >
                  <span> = </span>
                  <input
                    className={classNames(
                      "w-48 font-mono",
                      formulaIsValid(column.formula) ? "" : "bg-red-100"
                    )}
                    value={column.formula}
                    onKeyDown={(e) => {
                      if (e.code === "Enter") {
                        setCurrentlyConfiguringColumn(undefined);
                      }
                    }}
                    onChange={(e) =>
                      runInAction(() => (column.formula = e.target.value))
                    }
                  ></input>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }
);
