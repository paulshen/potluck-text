import { computed } from "mobx";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { executeFormula } from "./formulas";
import {
  SnippetGroup,
  SnippetToken,
  editorStateDoc,
  GROUP_TOKEN_ROW_GAP,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  SpatialComponentType,
  TOKEN_HEIGHT,
  GROUP_COLUMN_WIDTH,
  GROUP_TOKEN_COLUMN_GAP,
  getGroupWidth,
} from "./primitives";
import { Token } from "./Token";
import { useDragSpatialComponent } from "./useDragSpatialComponent";

export const SnippetTokenComponent = observer(
  ({ snippet }: { snippet: SnippetToken }) => {
    const text = computed(() => {
      return editorStateDoc.get()!.sliceDoc(snippet.span[0], snippet.span[1]);
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
    if (snippetGroup !== undefined) {
      const index = snippetGroup.snippetIds.indexOf(snippet.id);
      left = snippetGroup.position[0];
      top =
        snippetGroup.position[1] +
        index * TOKEN_HEIGHT +
        index * GROUP_TOKEN_ROW_GAP;
    } else {
      left = snippet.position[0];
      top = snippet.position[1];
    }

    return (
      <div
        {...bindDrag()}
        className="absolute touch-none"
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
          snippetGroup.extraColumns.map((column, index) => (
            <div
              className={classNames(
                "absolute touch-none px-2 py-1 text-xs font-mono cursor-default whitespace-nowrap",
                snippetGroup !== undefined ? "-z-1" : undefined
              )}
              style={{
                top: "0px",
                left: `${GROUP_COLUMN_WIDTH * (index + 1)}px`,
                width: `${GROUP_COLUMN_WIDTH - GROUP_TOKEN_COLUMN_GAP}px`,
              }}
            >
              {snippet.extraData[column.id] ??
                (column.formula &&
                  executeFormula(column.formula, text, snippet.extraData))}
            </div>
          ))}
      </div>
    );
  }
);
