import { computed } from "mobx";
import { observer } from "mobx-react-lite";
import { Snippet, textEditorStateMobx } from "./primitives";

export const SnippetTokenHovercardContent = observer(
  ({ snippet }: { snippet: Snippet }) => {
    const text = computed(() => {
      return textEditorStateMobx
        .get(snippet.textId)!
        .sliceDoc(snippet.span[0], snippet.span[1]);
    }).get();
    return (
      <div className="p-4 text-sm">
        <div>This is the hovercard for {text}.</div>
        <div>Properties: {JSON.stringify(snippet.data)}</div>
      </div>
    );
  }
);
