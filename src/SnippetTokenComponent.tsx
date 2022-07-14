import * as HoverCard from "@radix-ui/react-hover-card";
import { action, computed } from "mobx";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { executeFormula } from "./formulas";
import {
  SnippetGroup,
  SnippetOnCanvas,
  GROUP_TOKEN_ROW_GAP,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  highlighterTypesMobx,
  SpatialComponentType,
  TOKEN_HEIGHT,
  GROUP_COLUMN_WIDTH,
  GROUP_TOKEN_COLUMN_GAP,
  getGroupWidth,
  dragStateBox,
  textEditorStateMobx,
  HighlighterType,
  Snippet,
  SnippetTypeViewConfiguration,
  snippetTypeViewConfigurationsMobx,
  spatialHoverSnippetIdBox,
} from "./primitives";
import { Token } from "./Token";
import { useDragSpatialComponent } from "./useDragSpatialComponent";
import {
  getPositionForSnippetInGroup,
  getSnippetForSnippetOnCanvas,
} from "./utils";
import { useRef, useState } from "react";
import { SnippetTokenHovercardContent } from "./SnippetTokenHovercardContent";

export const SnippetTokenComponent = observer(
  ({ snippetOnCanvas }: { snippetOnCanvas: SnippetOnCanvas }) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
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

    const snippetType: HighlighterType = computed(() => {
      return highlighterTypesMobx.get(snippet.snippetTypeId);
    }).get()!;

    const snippetTypeViewConfiguration: SnippetTypeViewConfiguration = computed(
      () => {
        return snippetTypeViewConfigurationsMobx.get(snippet.snippetTypeId);
      }
    ).get()!;

    const bindDrag = useDragSpatialComponent(rootRef, snippetOnCanvas);

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
    const [disableHovercard, setDisableHovercard] = useState(false);
    if (isBeingDragged && !disableHovercard) {
      setDisableHovercard(true);
    }

    const propertiesToShow = snippetType.properties.filter(
      (p) =>
        snippetTypeViewConfiguration.inlineVisiblePropertyIds.includes(p.id) &&
        snippet.data[p.id] !== undefined
    );

    return (
      <div
        {...bindDrag()}
        onMouseEnter={() => {
          setDisableHovercard(false);
        }}
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
        ref={rootRef}
      >
        <HoverCard.Root open={disableHovercard ? false : undefined}>
          <HoverCard.Trigger>
            <Token
              onMouseEnter={action(() => {
                spatialHoverSnippetIdBox.set(snippetOnCanvas.snippetId);
              })}
              onMouseLeave={action(() => {
                spatialHoverSnippetIdBox.set(undefined);
              })}
              isSelected={isSelected}
              className={
                !isSelected
                  ? "hover:bg-black hover:text-white transition"
                  : undefined
              }
            >
              {text}
              {propertiesToShow.length > 0 ? (
                <div className="absolute left-0 bottom-full mb-0.5 flex gap-2">
                  {propertiesToShow.map(
                    (property) =>
                      snippet.data[property.id] !== undefined && (
                        <span
                          className="text-[9px] text-gray-500 leading-[9px]"
                          key={property.id}
                        >
                          {snippet.data[property.id]}
                        </span>
                      )
                  )}
                </div>
              ) : null}
            </Token>
          </HoverCard.Trigger>

          <HoverCard.Content
            sideOffset={4}
            align={"start"}
            className="border border-zinc-100 bg-white rounded-md shadow-lg"
          >
            <SnippetTokenHovercardContent snippet={snippet} />
          </HoverCard.Content>
        </HoverCard.Root>
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
                key={column.id}
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
