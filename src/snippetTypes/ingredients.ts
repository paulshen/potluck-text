// A hardcoded ingredient plugin
// See ingredients.csv for the data
// Food names source: some random website (I forget where)
// Climate impact source: https://ourworldindata.org/environmental-impacts-of-food

import {
  INGREDIENT_REFERENCE_TYPE,
  INGREDIENT_TYPE,
  Snippet,
  snippetsMobx,
  SnippetSuggestion,
  SnippetType,
  Span,
  textEditorViewsMap,
} from "../primitives";
import { spanOverlaps } from "../utils";

// @ts-ignore
import rawIngredients from "./ingredients.csv";
import { EditorView } from "codemirror";
import { ChangeSet } from "@codemirror/state";

type Ingredient = {
  name: string;
  aisle: string;
  climate: number;
  veganAlternative: string;
  description: string;
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
    let matches: SnippetSuggestion[] = [];
    // We could probably do this faster if we combined all the known strings into one regex,
    // but this is simpler to reason about and seems fast enough for now.
    for (const stringTemplate of ingredients.map((i) => i.name)) {
      for (const match of text.matchAll(
        new RegExp(`\\b${stringTemplate}\\b`, "ig")
      )) {
        const from = match.index ?? 0;
        const to = from + match[0].length;
        // Only add the match if it doesn't overlap with other existing matches.
        // This prevents weird overlapping matches
        if (
          matches.some((existing) => spanOverlaps(existing.span, [from, to]))
        ) {
          continue;
        }

        // If there's already an ingredient w/ this name, don't match
        if (
          matches.some(
            (existing) =>
              text.slice(existing.span[0], existing.span[1]) ===
              text.slice(from, to)
          )
        ) {
          matches.push({
            span: [from, to],
            snippetTypeId: INGREDIENT_REFERENCE_TYPE,
          });
          continue;
        }

        matches.push({
          span: [from, to],
          snippetTypeId: INGREDIENT_TYPE,
        });
      }
    }

    return matches;
  },

  parse: (text: string) => {
    const ingredient = ingredients.find(
      (i) => i.name.toLowerCase() === text.toLowerCase()
    );
    if (ingredient !== undefined) {
      return {
        "ingredient--icon": "🥕",
        "ingredient--aisle": ingredient.aisle,
        "ingredient--climate": ingredient.climate,
        "ingredient--veganAlternative": ingredient.veganAlternative,
        "ingredient--description": ingredient.description,
      };
    } else {
      return { "ingredient--icon": "🥕" };
    }
  },

  properties: [
    { id: "ingredient--icon", name: "Icon", type: "string" },
    { id: "ingredient--aisle", name: "Aisle", type: "string" },
    { id: "ingredient--climate", name: "CO2 Emissions", type: "number" },
    {
      id: "ingredient--veganAlternative",
      name: "Vegan Alternative",
      type: "string",
      actions: [
        {
          label: "replace",
          available: (snippet: Snippet) => {
            const alternative = snippet.data["ingredient--veganAlternative"];
            return alternative !== undefined;
          },
          handler: (snippet: Snippet) => {
            const alternative = snippet.data["ingredient--veganAlternative"];

            const view = textEditorViewsMap[snippet.textId];
            view.dispatch({
              changes: ChangeSet.of(
                {
                  from: snippet.span[0],
                  to: snippet.span[1],
                  insert: alternative,
                },
                view.state.doc.length
              ),
            });

            // reparse snippet

            snippetsMobx.set(snippet.id, {
              id: snippet.id,
              snippetTypeId: snippet.snippetTypeId,
              textId: snippet.textId,
              span: [snippet.span[0], snippet.span[0] + alternative.length],
              data: ingredientSnippetType.parse(alternative),
            });
          },
        },
      ],
    },
    { id: "ingredient--description", name: "Description", type: "string" },
  ],
};
