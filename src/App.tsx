import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { highlightSelectionMatches } from "@codemirror/search";

export function App() {
  const editorRef = useRef(null);
  useEffect(() => {
    const view = new EditorView({
      extensions: [
        basicSetup,
        EditorView.theme({
          "&": { height: "100%" },
        }),
        highlightSelectionMatches({ wholeWords: true }),
      ],
      parent: editorRef.current!,
    });
    return () => {
      view.destroy();
    };
  }, []);
  return (
    <div className="p-8">
      <div className="w-[512px] h-[512px]" ref={editorRef}></div>
    </div>
  );
}
