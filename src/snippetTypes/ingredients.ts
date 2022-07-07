// A hardcoded ingredient plugin
// See ingredients.csv for the data
// Food names source: some random website (I forget where)
// Climate impact source: https://ourworldindata.org/environmental-impacts-of-food

import {
  INGREDIENT_TYPE, Snippet, snippetsMobx,
  SnippetSuggestion,
  SnippetType, snippetTypesMobx,
  Span,
} from "../primitives";
import { spanOverlaps } from "../utils";

// @ts-ignore
import rawIngredients from "./ingredients.csv";
import {EditorView} from "codemirror";
import {ChangeSet} from "@codemirror/state";
import {nanoid} from "nanoid";

type Ingredient = {
  name: string;
  aisle: string;
  climate: number;
  veganAlternative: string;
};

const ingredients: Ingredient[] = rawIngredients.map((i: any) => {
  let result = i;
  for (const [key, val] of Object.entries(result)) {
    if ((val as string).length === 0) {
      delete result[key];
    }
  }
  return result;
});

export const ingredientSnippetType: SnippetType = {
  name: "Ingredient",
  icon: "🥕",
  color: "#ffc107",
  suggest: (text: string): SnippetSuggestion[] => {
    let matches: Span[] = [];
    // We could probably do this faster if we combined all the known strings into one regex,
    // but this is simpler to reason about and seems fast enough for now.
    for (const stringTemplate of ingredients.map((i) => i.name)) {
      for (const match of text.matchAll(new RegExp(stringTemplate, "ig"))) {
        const from = match.index ?? 0;
        const to = from + match[0].length;
        // Only add the match if it doesn't overlap with other existing matches.
        // This prevents weird overlapping matches
        if (!matches.some((existing) => spanOverlaps(existing, [from, to]))) {
          matches.push([from, to]);
        }
      }
    }

    return matches.map(([from, to]) => ({
      span: [from, to],
      snippetTypeId: INGREDIENT_TYPE,
    }));
  },

  parse: (text: string) => {
    const ingredient = ingredients.find((i) => i.name === text);
    if (ingredient !== undefined) {
      return {
        "ingredient--icon": "🥕",
        "ingredient--aisle": ingredient.aisle,
        "ingredient--climate": ingredient.climate,
        "ingredient--veganAlternative": ingredient.veganAlternative
      };
    } else {
      return { "ingredient--icon": "🥕" };
    }
  },

  properties: [
    { id: "ingredient--icon", name: "Icon", type: "string" },
    { id: "ingredient--aisle", name: "Aisle", type: "string" },
    { id: "ingredient--climate", name: "Climate Impact", type: "number" },
    {
      id: "ingredient--veganAlternative",
      name: "Vegan Alternative",
      type: "string",
      onClick: (snippet: Snippet, view: EditorView) => {
        const alternative = snippet.data["ingredient--veganAlternative"]

         view.dispatch({
           changes: ChangeSet.of(
             {
               // this currently inserts the annotation text after the snippet
               from: snippet.span[0],
               to: snippet.span[1],
               insert: alternative,
             },
             view.state.doc.length
           ),
         });

        // reparse snippet

        snippetsMobx.set(snippet.id, {
          id: nanoid(),
          snippetTypeId: snippet.snippetTypeId,
          textId: snippet.textId,
          span: [snippet.span[0], snippet.span[0] + alternative.length - 1],
          data: ingredientSnippetType.parse(alternative),
        })
      },
    }
  ],
};
