import { Facet, StateEffect, StateField } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { autorun, comparer, computed, reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useRef, useEffect, useMemo } from "react";
import {
  Highlight,
  textEditorStateMobx,
  highlighterTypesMobx,
  textEditorViewsMap,
  INGREDIENT_TYPE,
  INGREDIENT_REFERENCE_TYPE,
  QUANTITY_TYPE,
  INGREDIENT_WITH_QUANTITY_TYPE,
  EXERCISE_NAME_TYPE,
  SETS_AND_REPS_TYPE,
  EXERCISE_ACTIVITY_TYPE,
} from "./primitives";
import { getLinkedHighlights, spanOverlaps } from "./utils";

const textIdFacet = Facet.define<string, string>({
  combine: (values) => values[0],
});

const setHighlightsEffect = StateEffect.define<Highlight[]>();
const highlightsField = StateField.define<Highlight[]>({
  create() {
    return [];
  },
  update(highlights, tr) {
    for (let e of tr.effects) {
      if (e.is(setHighlightsEffect)) {
        return e.value;
      }
    }

    if (!tr.docChanged) {
      return highlights;
    }

    return highlights.map((highlight) => ({
      ...highlight,
      span: [
        tr.changes.mapPos(highlight.span[0]),
        tr.changes.mapPos(highlight.span[1]),
      ],
    }));
  },
});

const highlightsDecoration = EditorView.decorations.from(
  highlightsField,
  (highlights) => (view) => {
    const pos = view.state.selection.main.anchor;

    // We don't want to show ingredientWithQuantity snippets... todo: figure out how to hide
    const visibleSnippetTypes = [
      INGREDIENT_TYPE,
      INGREDIENT_REFERENCE_TYPE,
      INGREDIENT_WITH_QUANTITY_TYPE,
      QUANTITY_TYPE,
    ];

    return Decoration.set(
      highlights.flatMap((highlight) => {
        const linkedHighlights = getLinkedHighlights(highlight, highlights);
        const active = [highlight, ...linkedHighlights].some((highlight) =>
          spanOverlaps(highlight.span, [pos, pos])
        );
        if (
          highlight.span[1] <= highlight.span[0] ||
          !visibleSnippetTypes.includes(highlight.highlighterTypeId)
        ) {
          return [];
        }
        const decoration = Decoration.mark({
          class: `cm-highlight  ${active ? "cm-highlight-active" : ""}`,
        });
        return [decoration.range(highlight.span[0], highlight.span[1])];
      }),
      true
    );
  }
);

export const Editor = observer(({ textId }: { textId: string }) => {
  const editorRef = useRef(null);
  const highlightsComputed = useMemo(
    () =>
      computed(() => {
        const text = computed(() =>
          textEditorStateMobx.get(textId)!.sliceDoc(0)
        );
        const highlights: Highlight[] = [
          ...highlighterTypesMobx.values(),
        ].reduce<Highlight[]>(
          (highlights, st) =>
            highlights.concat(st.highlight(text.get(), highlights)),
          []
        );
        return highlights;
      }),
    [textId]
  );

  useEffect(() => {
    const view = new EditorView({
      doc: textEditorStateMobx.get(textId)?.doc ?? "",
      extensions: [
        minimalSetup,
        EditorView.theme({
          "&": {
            height: "100%",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "#e4e4e7",
            color: "red",
          },
          "&.cm-editor.cm-focused": {
            outline: "none",
          },
          ".cm-line": {
            "border-bottom": "solid thin hsl(188deg 92% 90%)",
          },
          ".cm-line:first-of-type": {
            "border-bottom": "solid thin #ffc9c9",
          },
          ".cm-scroller": {
            fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
            fontSize: "1rem",
            lineHeight: "1.75em",
          },
          ".cm-highlight": {
            // padding: "0 2px",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255,247,200, 1) 50%, rgba(255,255, 255,0) 100%)",
            boxSizing: "border-box",
          },
          ".cm-highlight-active": {
            borderBottom: "2px solid hsl(55deg 80% 55%)",
          },
          ".metakey-down & .cm-highlight:hover, .metakey-down & .cm-snippet:hover":
            {
              cursor: "pointer",
            },
          ".metakey-down.shiftkey-down & .cm-highlight-shift-range": {
            borderBottom: "2px dashed black",
          },
          ".cm-snippet": {
            borderBottom: "1px solid black",
          },
          ".metakey-down & .cm-snippet:hover": {
            cursor: "grab",
          },
          ".cm-snippet .cm-highlight": {
            backgroundColor: "#80808015",
            textDecoration: "none",
          },
          ".cm-tooltip": {
            border: "none",
            backgroundColor: "transparent",
          },
        }),
        EditorView.lineWrapping,
        textIdFacet.of(textId),
        highlightsField,
        highlightsDecoration,
      ],
      parent: editorRef.current!,
      dispatch(transaction) {
        view.update([transaction]);
        runInAction(() => {
          textEditorStateMobx.set(textId, transaction.state);
        });
      },
    });
    textEditorViewsMap[textId] = view;

    runInAction(() => {
      textEditorStateMobx.set(textId, view.state);
    });
    const unsubscribes: (() => void)[] = [
      reaction(
        () => highlightsComputed.get(),
        (highlights) => {
          view.dispatch({
            effects: [setHighlightsEffect.of(highlights)],
          });
        },
        { equals: comparer.structural, fireImmediately: true }
      ),
    ];
    return () => {
      view.destroy();
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      delete textEditorViewsMap[textId];
    };
  }, []);

  const allHighlights = highlightsComputed.get();

  const ingredientHighlights = allHighlights
    .sort((a, b) => a.span[0] - b.span[0])
    .filter((s) => s.highlighterTypeId === INGREDIENT_TYPE)
    .map((ingredientHighlight) => {
      const ingredientWithQuantity = allHighlights.find(
        (otherHighlight) =>
          otherHighlight.highlighterTypeId === INGREDIENT_WITH_QUANTITY_TYPE &&
          otherHighlight.refs.ingredient === ingredientHighlight
      );

      const text = textEditorStateMobx
        .get(textId)
        ?.doc.sliceString(
          ingredientHighlight.span[0],
          ingredientHighlight.span[1]
        );

      return {
        ...ingredientHighlight,
        text,
        quantity: ingredientWithQuantity?.refs.quantity,
      };
    });

  return (
    <div>
      <div
        className="text-lg h-[500px] bg-white border-black border-b-2 border-l-2 border-r-2 rounded-b-lg overflow-auto"
        ref={editorRef}
      ></div>

      {ingredientHighlights.length > 0 && (
        <div className="absolute left-[550px] top-0 w-[300px]">
          <span className="font-bold text-sm text-gray-400">
            Ingredients Summary
          </span>

          {ingredientHighlights.map((highlight) => (
            <div
              className="border-gray-300 border p-1 my-1 rounded-lg flex"
              key={highlight.span[0]}
            >
              <div>{highlight.text} </div>
              <div className="text-gray-400 ml-2 right">
                {highlight.quantity &&
                  `(${highlight.quantity.data["quantity--quantity"]} ${highlight.quantity.data["quantity--unitOfMeasure"]})`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
