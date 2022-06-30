import { useDrag, Handler } from "@use-gesture/react";
import { computed, action, untracked } from "mobx";
import { observer } from "mobx-react-lite";
import {
  SnippetGroup,
  SnippetToken,
  editorStateDoc,
  GROUP_TOKEN_GAP,
  GROUP_WIDTH,
  selectedSpatialComponentsMobx,
  SpatialComponent,
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
      action<Handler<"drag">>(({ delta, first, event, cancel, memo = {} }) => {
        let activeComponents: SpatialComponent[] | undefined =
          memo.activeComponents;
        if (activeComponents === undefined) {
          const group = spatialComponentsMobx.find(
            (s) =>
              s.type === SpatialComponentType.SnippetGroup &&
              s.snippetIds.includes(snippet.id)
          );
          const elementId = (group ?? snippet).id;
          if (selectedSpatialComponentsMobx.includes(elementId)) {
            activeComponents = spatialComponentsMobx.filter((s) =>
              selectedSpatialComponentsMobx.includes(s.id)
            );
          } else {
            activeComponents = [group ?? snippet];
          }
          memo.activeComponents = activeComponents;
        }
        if (first) {
          event.preventDefault();
        }
        for (const component of activeComponents) {
          component.position[0] = component.position[0] + delta[0];
          component.position[1] = component.position[1] + delta[1];
        }
      })
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
        className="absolute touch-none"
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
