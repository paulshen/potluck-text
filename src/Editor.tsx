import { Facet, Prec, StateEffect, StateField } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import {
  autorun,
  comparer,
  computed,
  reaction,
  runInAction,
  set,
  toJS,
} from "mobx";
import { observer } from "mobx-react-lite";
import { useRef, useEffect, useMemo } from "react";
import {
  Highlight,
  textEditorStateMobx,
  textEditorViewsMap,
  INGREDIENT_TYPE,
  INGREDIENT_REFERENCE_TYPE,
  QUANTITY_TYPE,
  INGREDIENT_WITH_QUANTITY_TYPE,
  EXERCISE_NAME_TYPE,
  SETS_AND_REPS_TYPE,
  EXERCISE_ACTIVITY_TYPE,
  highlightersMobx,
  hiddenHighlighterIdsMobx,
  antiHighlightsMobx,
  AntiHighlight,
} from "./primitives";
import { getLinkedHighlights, spanOverlaps } from "./utils";
import { parseWithHighlighter } from "./HighlightManager";

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

const setHiddenHighlightIds = StateEffect.define<Set<string>>();
const hiddenHighlightIdsField = StateField.define<Set<string>>({
  create() {
    return new Set();
  },
  update(hiddenHighlightIds, tr) {
    for (let e of tr.effects) {
      if (e.is(setHiddenHighlightIds)) {
        return e.value;
      }
    }
    return hiddenHighlightIds;
  },
});

const highlightsDecoration = EditorView.decorations.compute(
  [highlightsField, hiddenHighlightIdsField],
  (state) => {
    const pos = state.selection.main.anchor;
    const highlights = state.field(highlightsField);
    const hiddenHighlightIds = state.field(hiddenHighlightIdsField);

    return Decoration.set(
      highlights.flatMap((highlight) => {
        const linkedHighlights = getLinkedHighlights(highlight, highlights);
        const active = [highlight, ...linkedHighlights].some((highlight) =>
          spanOverlaps(highlight.span, [pos, pos])
        );
        if (
          highlight.span[1] <= highlight.span[0] ||
          hiddenHighlightIds.has(highlight.highlighterTypeId)
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

// Accept suggestions (just the one near the cursor, or all) with keyboard shortcuts
const eraseHighlightsPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {}
    update(update: ViewUpdate) {}
    destroy() {}
  },
  {
    eventHandlers: {
      keydown(event, view) {
        // cmd-backspace to remove highlights in a range
        if (event.key === "0" && event.metaKey) {
          event.preventDefault();
          runInAction(() => {
            const antiHighlight: AntiHighlight = {
              span: [
                view.state.selection.main.from,
                view.state.selection.main.to,
              ],
              textId: view.state.facet(textIdFacet),
            };
            antiHighlightsMobx.push(antiHighlight);
          });
        }
      },
    },
  }
);

export const Editor = observer(({ textId }: { textId: string }) => {
  const editorRef = useRef(null);
  const highlightsComputed = useMemo(
    () =>
      computed(() => {
        const textComputed = computed(() =>
          textEditorStateMobx.get(textId)!.sliceDoc(0)
        );
        const antiHighlights = antiHighlightsMobx.filter(
          (ah) => ah.textId === textId
        );
        const highlights: Highlight[] = [...highlightersMobx.values()].reduce<
          Highlight[]
        >((highlights, highlighter) => {
          const text = textComputed.get();
          let addHighlights = parseWithHighlighter(
            highlighter,
            text,
            highlights
          ).filter(
            (highlight) =>
              !antiHighlights.some((ah) =>
                spanOverlaps(ah.span, highlight.span)
              )
          );
          if (highlighter.postProcess !== undefined) {
            addHighlights = addHighlights.map((h) =>
              highlighter.postProcess!(h, text)
            );
          }
          return highlights.concat(addHighlights);
        }, []);
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
        hiddenHighlightIdsField,
        Prec.high(eraseHighlightsPlugin),
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
      autorun(() => {
        view.dispatch({
          effects: [setHiddenHighlightIds.of(toJS(hiddenHighlighterIdsMobx))],
        });
      }),
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
