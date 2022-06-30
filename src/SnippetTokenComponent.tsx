import { computed } from "mobx";
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
import { useDragSpatialComponent } from "./utils";

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
