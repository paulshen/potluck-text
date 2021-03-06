// A hardcoded ingredient plugin
// See ingredients.csv for the data
// Food names source: some random website (I forget where)
// Climate impact source: https://ourworldindata.org/environmental-impacts-of-food

import {
  INGREDIENT_TYPE,
  INGREDIENT_WITH_QUANTITY_TYPE,
  QUANTITY_TYPE,
  Highlight,
  HighlighterType,
} from "../primitives";
import {
  findNextCharacter,
  findPreviousCharacter,
  spanOverlaps,
} from "../utils";

// @ts-ignore
import rawIngredients from "./ingredients.csv";
import { sortBy } from "lodash";
import { createHighlighter, HighlighterSchemaType } from "../HighlightCreator";

type Ingredient = {
  name: string;
  aisle: string;
  climate: number;
  veganAlternative: string;
  description: string;
};

export const ingredientWithQuantityType: HighlighterType = {
  name: "Ingredient with quantity",
  icon: "",
  color: "#ffc107",
  highlight: createHighlighter({
    // TODO: untangle circular dependency so this can use constants
    id: "ingredient_with_quantity",
    type: HighlighterSchemaType.NextToHighlighter,
    firstHighlightTypeId: "quantity",
    secondHighlightTypeId: "ingredient",
    maxDistanceBetween: 50,
  }),

  parse: (text: string) => {},

  properties: [],
};
