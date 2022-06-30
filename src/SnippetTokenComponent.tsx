import { useDrag, Handler } from "@use-gesture/react";
import classNames from "classnames";
import { computed, action, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import {
  SnippetGroup,
  SnippetToken,
  editorStateDoc,
  GROUP_TOKEN_GAP,
  GROUP_WIDTH,
  selectedSpatialComponentsMobx,
  spatialComponentsMobx,
  SpatialComponentType,
  TOKEN_HEIGHT,
} from "./primitives";
import { Token } from "./Token";

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

    const bindDrag = useDrag(
      action<Handler<"drag">>(({ offset, delta, first, event, cancel }) => {
        if (first) {
          event.preventDefault();
          if (snippetGroup !== undefined) {
            cancel();
            return;
          }
        }
        if (selectedSpatialComponentsMobx.includes(snippet.id)) {
          for (const spatialComponent of spatialComponentsMobx) {
            if (selectedSpatialComponentsMobx.includes(spatialComponent.id)) {
              spatialComponent.position = [
                spatialComponent.position[0] + delta[0],
                spatialComponent.position[1] + delta[1],
              ];
            }
          }
        } else {
          snippet.position = offset;
        }
      }),
      {
        from: () => untracked(() => snippet.position),
      }
    );

    let top;
    let left;
    if (snippetGroup !== undefined) {
      const index = snippetGroup.snippetIds.indexOf(snippet.id);
      left = snippetGroup.position[0];
      top =
        snippetGroup.position[1] +
        index * TOKEN_HEIGHT +
        index * GROUP_TOKEN_GAP;
    } else {
      left = snippet.position[0];
      top = snippet.position[1];
    }

    return (
      <div
        {...bindDrag()}
        className={classNames(
          "absolute touch-none",
          snippetGroup !== undefined ? "-z-1" : undefined
        )}
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: snippetGroup !== undefined ? `${GROUP_WIDTH}px` : undefined,
        }}
      >
        <Token isSelected={isSelected}>{text}</Token>
      </div>
    );
  }
);
