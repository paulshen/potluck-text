import { Handler, useDrag } from "@use-gesture/react";
import classNames from "classnames";
import { action, computed, runInAction, set, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import { nanoid } from "nanoid";
import { useState } from "react";
import { formulaIsValid } from "./formulas";
import {
  SnippetGroup,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  GROUP_COLUMN_WIDTH,
  getGroupWidth,
} from "./primitives";
import { getRectForSnippetGroup } from "./utils";

export const SnippetGroupComponent = observer(
  ({ group }: { group: SnippetGroup }) => {
    const [currentlyConfiguringColumn, setCurrentlyConfiguringColumn] =
      useState<string>();

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

    return (
      <>
        <div
          className={classNames(
            "absolute touch-none border border-dashed rounded-sm border-zinc-200 p-1 -z-1",
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
