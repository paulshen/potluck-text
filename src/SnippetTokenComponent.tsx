import { computed } from "mobx";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { executeFormula } from "./formulas";
import {
  SnippetGroup,
  SnippetToken,
  GROUP_TOKEN_ROW_GAP,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  SpatialComponentType,
  TOKEN_HEIGHT,
  GROUP_COLUMN_WIDTH,
  GROUP_TOKEN_COLUMN_GAP,
  getGroupWidth,
  dragStateBox,
  textEditorStateMobx,
} from "./primitives";
import { Token } from "./Token";
import { useDragSpatialComponent } from "./useDragSpatialComponent";
import { getPositionForSnippetInGroup } from "./utils";

export const SnippetTokenComponent = observer(
  ({ snippet }: { snippet: SnippetToken }) => {
    const text = computed(() => {
      return textEditorStateMobx
        .get(snippet.textId)!
        .sliceDoc(snippet.span[0], snippet.span[1]);
    }).get();
    // @ts-ignore
    const snippetGroup: SnippetGroup | undefined = computed(() =>
      spatialComponentsMobx.find(
        (spatialComponent) =>
          spatialComponent.type === SpatialComponentType.SnippetGroup &&
          spatialComponent.snippetIds.includes(snippet.id)
      )
    ).get();
    const isSelected = computed(
      () =>
        snippetGroup === undefined &&
        selectedSpatialComponentsMobx.includes(snippet.id)
    ).get();

    const bindDrag = useDragSpatialComponent(snippet);

    let top;
    let left;
    let isBeingDragged = false;
    if (snippetGroup !== undefined) {
      const index = snippetGroup.snippetIds.indexOf(snippet.id);
      const position = getPositionForSnippetInGroup(snippetGroup, index);
      left = position[0];
      top = position[1];
      isBeingDragged =
        dragStateBox.get()?.spatialComponentIds.includes(snippetGroup.id) ??
        false;
    } else {
      left = snippet.position[0];
      top = snippet.position[1];
      isBeingDragged =
        dragStateBox.get()?.spatialComponentIds.includes(snippet.id) ?? false;
    }

    return (
      <div
        {...bindDrag()}
        className={classNames(
          "absolute touch-none",
          isBeingDragged ? "z-50" : undefined
        )}
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width:
            snippetGroup !== undefined
              ? `${GROUP_COLUMN_WIDTH - GROUP_TOKEN_COLUMN_GAP}px`
              : undefined,
        }}
      >
        <Token isSelected={isSelected}>{text}</Token>
        {snippetGroup &&
          snippetGroup.extraColumns.map((column, index) => {
            const data =
              snippet.extraData[column.id] ??
              (column.formula &&
                executeFormula(column.formula, text, snippet.extraData));
            return (
              <div
                className={classNames(
                  "absolute touch-none px-2 py-1 text-sm font-mono cursor-default whitespace-nowrap",
                  snippetGroup !== undefined ? "-z-1" : undefined
                )}
                style={{
                  top: "0px",
                  left: `${GROUP_COLUMN_WIDTH * (index + 1)}px`,
                  width: `${GROUP_COLUMN_WIDTH - GROUP_TOKEN_COLUMN_GAP}px`,
                }}
              >
                {typeof data === "string" && data}
                {/* TODO: we currently infer the column type from data, but could
                explicitly config it too.*/}
                {typeof data === "boolean" && (
                  <input
                    type="checkbox"
                    checked={data}
                    onChange={() => {
                      snippet.extraData[column.id] = !data;
                    }}
                  ></input>
                )}
              </div>
            );
          })}
      </div>
    );
  }
);
