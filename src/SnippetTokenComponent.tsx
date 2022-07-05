import { computed } from "mobx";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { executeFormula } from "./formulas";
import {
  SnippetGroup,
  SnippetOnCanvas,
  GROUP_TOKEN_ROW_GAP,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  snippetTypesMobx,
  SpatialComponentType,
  TOKEN_HEIGHT,
  GROUP_COLUMN_WIDTH,
  GROUP_TOKEN_COLUMN_GAP,
  getGroupWidth,
  dragStateBox,
  textEditorStateMobx,
  SnippetType,
  Snippet,
} from "./primitives";
import { Token } from "./Token";
import { useDragSpatialComponent } from "./useDragSpatialComponent";
import {
  getPositionForSnippetInGroup,
  getSnippetForSnippetOnCanvas,
} from "./utils";

export const SnippetTokenComponent = observer(
  ({ snippetOnCanvas }: { snippetOnCanvas: SnippetOnCanvas }) => {
    const snippet: Snippet = computed(() =>
      getSnippetForSnippetOnCanvas(snippetOnCanvas)
    ).get();
    const text = computed(() => {
      return textEditorStateMobx
        .get(snippet.textId)!
        .sliceDoc(snippet.span[0], snippet.span[1]);
    }).get();
    // @ts-ignore
    const snippetGroup: SnippetGroup | undefined = computed(() =>
      spatialComponentsMobx.find(
        (spatialComponent) =>
          spatialComponent.spatialComponentType ===
            SpatialComponentType.SnippetGroup &&
          spatialComponent.snippetIds.includes(snippetOnCanvas.id)
      )
    ).get();
    const isSelected = computed(
      () =>
        snippetGroup === undefined &&
        selectedSpatialComponentsMobx.includes(snippetOnCanvas.id)
    ).get();

    const snippetType: SnippetType = computed(() => {
      return snippetTypesMobx.get(snippet.snippetTypeId);
    }).get()!;

    const bindDrag = useDragSpatialComponent(snippetOnCanvas);

    let top;
    let left;
    let isBeingDragged = false;
    if (snippetGroup !== undefined) {
      const index = snippetGroup.snippetIds.indexOf(snippetOnCanvas.id);
      const position = getPositionForSnippetInGroup(snippetGroup, index);
      left = position[0];
      top = position[1];
      isBeingDragged =
        dragStateBox.get()?.spatialComponentIds.includes(snippetGroup.id) ??
        false;
    } else {
      left = snippetOnCanvas.position[0];
      top = snippetOnCanvas.position[1];
      isBeingDragged =
        dragStateBox.get()?.spatialComponentIds.includes(snippetOnCanvas.id) ??
        false;
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
        <Token isSelected={isSelected}>
          {snippetType.icon} {text}
        </Token>
        {snippetGroup &&
          snippetGroup.extraColumns.map((column, index) => {
            const data =
              snippet.data[column.id] ??
              (column.formula &&
                executeFormula(column.formula, text, snippet.data));
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
                      snippet.data[column.id] = !data;
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
