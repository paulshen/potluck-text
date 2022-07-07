// A hardcoded ingredient plugin
// See ingredients.csv for the data
// Food names source: some random website (I forget where)
// Climate impact source: https://ourworldindata.org/environmental-impacts-of-food

import { parseIngredient } from "parse-ingredient";
import {
  QUANTITY_TYPE,
  SnippetSuggestion,
  SnippetType,
  Span,
} from "../primitives";
import { spanOverlaps } from "../utils";

type Quantity = {
  quantity: number | null;
  quantity2: number | null;
  unitOfMeasureID: string | null;
  unitOfMeasure: string | null;
};

export const quantitySnippetType: SnippetType = {
  name: "Quantity",
  icon: "⚖️",
  color: "#ffc107",
  suggest: (text: string): SnippetSuggestion[] => {
    let matches: Span[] = [];
    for (const match of text.matchAll(
      /(\d|\/)+\s?(oz|tsp|Tbsp|pounds|Cup|can|teaspoons|teaspoon|tablespoons|tablespoon)/gi
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
      snippetTypeId: QUANTITY_TYPE,
    }));
  },

  parse: (text: string) => {
    // This is super weird, but the quantity parsing library expects to parse a whole ingredient,
    // so we have to add a fake food at the end of the quantity to get it to work right
    const data = parseIngredient(`${text} milk`)[0];
    if (data === undefined) {
      return {};
    }
    return {
      "quantity--quantity": data.quantity,
      "quantity--quantity2": data.quantity2,
      "quantity--unitOfMeasure": data.unitOfMeasure,
    };
  },

  properties: [
    { id: "quantity--quantity", name: "Quantity", type: "number" },
    { id: "quantity--quantity2", name: "Secondary quantity", type: "number" },
    { id: "quantity--unitOfMeasure", name: "Unit", type: "string" },
  ],
};
