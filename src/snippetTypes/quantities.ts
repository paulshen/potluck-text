// A hardcoded ingredient plugin
// See ingredients.csv for the data
// Food names source: some random website (I forget where)
// Climate impact source: https://ourworldindata.org/environmental-impacts-of-food

import { parseIngredient } from "parse-ingredient";
import { createHighlighter, HighlighterSchemaType } from "../HighlightCreator";
import { QUANTITY_TYPE, Highlight, HighlighterType, Span } from "../primitives";

export const parseQuantity = (text: string) => {
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

  if (data.unitOfMeasure === "teaspoons" || data.unitOfMeasure === "teaspoon") {
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
};

export const quantitySnippetType: HighlighterType = {
  name: "Quantity",
  icon: "⚖️",
  color: "#ffc107",
  highlight: createHighlighter({
    // TODO: untangle circular dependency so this can be QUANTITY_TYPE
    id: "quantity",
    type: HighlighterSchemaType.RegexHighlighter,
    regex:
      "(\\d|\\/|¼|½|¾|⅛|\\.)+\\s?(g|gram|oz|tsp|Tbsp|pound|cup|cup|can|teaspoon|tablespoon)s?\\b",
    postProcess: (highlights, text) => {
      return highlights.map((highlight) => ({
        ...highlight,
        data: parseQuantity(text.slice(highlight.span[0], highlight.span[1])),
      }));
    },
  }),

  parse: parseQuantity,

  properties: [
    { id: "quantity--quantity", name: "Quantity", type: "number" },
    { id: "quantity--quantity2", name: "Secondary quantity", type: "number" },
    { id: "quantity--unitOfMeasure", name: "Unit", type: "string" },
    { id: "quantity--standardMetric", name: "Metric units", type: "string" },
  ],
};
