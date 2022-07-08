import {
  QUANTITY_TYPE,
  SCALE_TYPE, Snippet, snippetsMobx,
  SnippetSuggestion,
  SnippetType,
  Span, textEditorViewsMap,
} from "../primitives";
import {spanOverlaps} from "../utils";
import {ChangeSet, ChangeSpec} from "@codemirror/state";

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


function changeScaleValue(snippet: Snippet, amount: number) {

  // calculate scale

  const currentValue = snippet.data['scale--value']

  let originalValue = snippet.data['__scale--original-value']

  if (!originalValue) {
    originalValue = snippet.data['__scale--original-value'] = currentValue
  }

  const newValue = (currentValue + amount)

  if (newValue < 1) {
    return
  }

  const scale = newValue / originalValue

  const view = textEditorViewsMap[snippet.textId];
  

  // update snippets

  const changes: ChangeSpec[] = []


  for (const otherSnippet of snippetsMobx.values()) {

    if (otherSnippet.textId !== snippet.textId) {
      continue
    }

    // ... scale

    if (otherSnippet.snippetTypeId === SCALE_TYPE) {
      let originalValue = otherSnippet.data['__scale--original-value']

      if (!originalValue) {
        originalValue = otherSnippet.data['__scale--original-value'] = otherSnippet.data['scale--value']
      }

      const newValue = otherSnippet.data['scale--value'] = originalValue * scale

      changes.push({
        from: otherSnippet.span[0],
        to: otherSnippet.span[1],
        insert: `= ${newValue} ${otherSnippet.data['scale--unit']}`,
      })
    }

    // ... quantities

    if (otherSnippet.snippetTypeId === QUANTITY_TYPE) {
      let originalQuantity = otherSnippet.data['__quantity--original-quantity']

      if (!originalQuantity) {
        originalQuantity = otherSnippet.data['__quantity--original-quantity'] = otherSnippet.data['quantity--quantity']
      }

      const newQuantity = otherSnippet.data['quantity--quantity'] = scale * originalQuantity


      changes.push({
        from: otherSnippet.span[0],
        to: otherSnippet.span[1],
        insert: `${newQuantity} ${otherSnippet.data['quantity--unitOfMeasure']}`
      })
    }
  }

  console.log(changes)

  view.dispatch({ changes })


}

