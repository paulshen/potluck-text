import {
  SCALE_TYPE, Snippet, snippetsMobx,
  SnippetSuggestion,
  SnippetType,
  Span, textEditorViewsMap,
} from "../primitives";
import {spanOverlaps} from "../utils";
import {ChangeSet} from "@codemirror/state";

export const scaleSnippetType: SnippetType = {
  name: "Scale",
  icon: "🍽",
  color: "#ffc107",
  suggest: (text: string): SnippetSuggestion[] => {
    let matches: Span[] = [];
    for (const match of text.matchAll(
      /=\s(\d)+\s[a-zA-Z]*/gi
    )) {
      const from = match.index ?? 0;
      const to = from + match[0].length;
      // Only add the match if it doesn't overlap with other existing matches.
      // This prevents weird overlapping matches
      if (!matches.some((existing) => spanOverlaps(existing, [from, to]))) {
        matches.push([from, to]);
      }
    }

    return matches.map(([from, to]) => ({
      span: [from, to],
      snippetTypeId: SCALE_TYPE,
    }));
  },

  parse: (text: string) => {
    const match = text.match(/=\s?(\d+)\s?([a-zA-Z]*)/)

    if (!match) {
      return {}
    }

    const [, value, unit] = match

    return {
      "scale--value": parseFloat(value),
      "scale--unit": unit
    }
  },

  properties: [
    {
      id: "scale--value",
      name: "Value",
      type: "number",
      actions: [
        {
          label: "+",
          available: (snippet: Snippet) => true,
          handler: (snippet: Snippet) => changeScaleValue(snippet, 1)
        },
        {
          label: "-",
          available: (snippet: Snippet) => true,
          handler: (snippet: Snippet) => changeScaleValue(snippet, -1)
        }
      ]
    },
    { id: "scale--unit", name: "Unit", type: "string" }
  ],
};


function changeScaleValue (snippet: Snippet, amount: number) {

  const currentValue = snippet.data['scale--value']

  if ((currentValue + amount) < 1) {
    return
  }

  snippet.data['scale--value'] += amount

  const view = textEditorViewsMap[snippet.textId];
  view.dispatch({
    changes: ChangeSet.of(
      {
        from: snippet.span[0],
        to: snippet.span[1],
        insert: `= ${snippet.data['scale--value']} ${snippet.data['scale--unit']}`,
      },
      view.state.doc.length
    ),
  });
}