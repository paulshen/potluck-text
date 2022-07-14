const MULTI_DRAG_SNIPPET_TOKEN_OFFSET = 48;
export {};

// OLD CODE THAT MAY BE USEFUL TO REFERENCE?
/*
export function NewDragSnippetComponent() {
  const [dragSnippet, setDragSnippet] =
    useState<
      | {
          spanPosition: [x: number, y: number] | undefined;
          span: Span;
          previewTexts: string[];
        }
      | undefined
    >(undefined);

  useEffect(() => {
    let dragSnippetTextId: string | undefined;
    let dragSnippetIds: string[] | undefined;
    let dragNonSnippetTextSpan: Span | undefined;
    let mouseOffset: [x: number, y: number] | undefined;
    let didMouseMove = false;
    function cleanup() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDragSnippet(undefined);
      dragSnippetTextId = undefined;
      dragSnippetIds = undefined;
      dragNonSnippetTextSpan = undefined;
      mouseOffset = undefined;
    }
    function onMouseMove(e: MouseEvent) {
      didMouseMove = true;
      const mouseOffsetSnapshot = mouseOffset!;
      setDragSnippet((dragSnippet) => ({
        ...dragSnippet!,
        spanPosition: [
          e.clientX + mouseOffsetSnapshot[0],
          e.clientY + mouseOffsetSnapshot[1],
        ],
      }));
    }
    function onMouseUp(e: MouseEvent) {
      runInAction(() => {
        let snippetIds = dragSnippetIds;
        if (snippetIds === undefined) {
          snippetIds = [
            createSnippetFromSpan(
              dragSnippetTextId!,
              dragNonSnippetTextSpan!,
              INGREDIENT_TYPE
            ),
          ];
        }
        if (didMouseMove) {
          snippetIds.forEach((snippetId, i) => {
            spatialComponentsMobx.push({
              spatialComponentType: SpatialComponentType.Snippet,
              id: nanoid(),
              snippetId,
              position: [
                e.clientX + mouseOffset![0],
                e.clientY +
                  mouseOffset![1] +
                  i * MULTI_DRAG_SNIPPET_TOKEN_OFFSET,
              ],
            });
          });
        }
      });
      cleanup();
    }
    function onStart({
      snippetId,
      textId,
      spanPosition,
      span,
      mouseOffset: mouseOffsetArg,
      text,
      shiftKey,
      altKey,
    }: {
      snippetId: string | undefined;
      textId: string;
      spanPosition: [x: number, y: number];
      span: Span;
      mouseOffset: [x: number, y: number];
      text: string;
      shiftKey: boolean;
      altKey: boolean;
    }) {
      dragSnippetTextId = textId;
      let previewTexts: string[];
      if (snippetId !== undefined) {
        if (shiftKey || altKey) {
          const snippetTypeId = snippetsMobx.get(snippetId)!.snippetTypeId;
          const snippetsOfTypeInText = values(snippetsMobx).filter(
            (snippet) =>
              snippet.textId === textId &&
              snippet.snippetTypeId === snippetTypeId
          );
          dragSnippetIds = snippetsOfTypeInText.map((snippet) => snippet.id);
          const editorState = textEditorStateMobx.get(textId)!;
          previewTexts = snippetsOfTypeInText.map((snippet) =>
            editorState.sliceDoc(snippet.span[0], snippet.span[1])
          );
        } else {
          dragSnippetIds = snippetId !== undefined ? [snippetId] : [];
          previewTexts = [text];
        }
      } else {
        dragNonSnippetTextSpan = span;
        previewTexts = [text];
      }
      mouseOffset = mouseOffsetArg;
      setDragSnippet({
        // we won't render the preview until user has moved the mouse
        spanPosition: undefined,
        span,
        previewTexts,
      });
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    dragNewSnippetEmitter.addListener("start", onStart);
    return () => {
      dragNewSnippetEmitter.removeListener("start", onStart);
      cleanup();
    };
  }, []);

  if (dragSnippet?.spanPosition === undefined) {
    return null;
  }

  const { spanPosition, previewTexts } = dragSnippet;
  return (
    <div
      className="fixed"
      style={{
        left: `${spanPosition[0]}px`,
        top: `${spanPosition[1]}px`,
      }}
    >
      {previewTexts.map((tokenText, i) => (
        <div
          className="absolute left-0"
          style={{
            top: `${i * MULTI_DRAG_SNIPPET_TOKEN_OFFSET}px`,
          }}
          key={i}
        >
          <Token>{tokenText}</Token>
        </div>
      ))}
    </div>
  );
}
*/
