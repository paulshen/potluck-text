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

export const quantitySnippetType: SnippetType = {
  name: "Quantity",
  icon: "⚖️",
  color: "#ffc107",
  suggest: (text: string): SnippetSuggestion[] => {
    let matches: Span[] = [];
    for (const match of text.matchAll(
      /(\d|\/|¼|½|¾|⅛|\.)+\s?(g|gram|oz|tsp|Tbsp|pound|cup|cup|can|teaspoon|tablespoon)s?\b/gi
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

    let snippetData: any = {
      "quantity--quantity": data.quantity,
      "quantity--quantity2": data.quantity2,
      "quantity--unitOfMeasure": data.unitOfMeasure,
    };

    if (data.quantity === undefined || typeof data.quantity !== "number") {
      return snippetData;
    }

    if (data.unitOfMeasure === "pounds") {
      snippetData["quantity--standardMetric"] = `${Math.round(
        data.quantity * 453.592
      )} g`;
    }

    if (data.unitOfMeasure === "ounces") {
      snippetData["quantity--standardMetric"] = `${Math.round(
        data.quantity * 28.34
      )} g`;
    }

    if (
      data.unitOfMeasure === "teaspoons" ||
      data.unitOfMeasure === "teaspoon"
    ) {
      snippetData["quantity--standardMetric"] = `${Math.round(
        data.quantity * 4.93
      )} ml`;
    }

    if (
      data.unitOfMeasure === "tablespoons" ||
      data.unitOfMeasure === "tablespoon"
    ) {
      snippetData["quantity--standardMetric"] = `${Math.round(
        data.quantity * 14.79
      )} ml`;
    }

    return snippetData;
  },

  properties: [
    { id: "quantity--quantity", name: "Quantity", type: "number" },
    { id: "quantity--quantity2", name: "Secondary quantity", type: "number" },
    { id: "quantity--unitOfMeasure", name: "Unit", type: "string" },
    { id: "quantity--standardMetric", name: "Metric units", type: "string" },
  ],
};
