// A hardcoded ingredient plugin
// See ingredients.csv for the data
// Food names source: some random website (I forget where)
// Climate impact source: https://ourworldindata.org/environmental-impacts-of-food

import {
  INGREDIENT_TYPE,
  INGREDIENT_WITH_QUANTITY_TYPE,
  QUANTITY_TYPE,
  Highlight,
  SnippetType,
} from "../primitives";
import {
  findNextCharacter,
  findPreviousCharacter,
  spanOverlaps,
} from "../utils";

// @ts-ignore
import rawIngredients from "./ingredients.csv";
import { sortBy } from "lodash";

type Ingredient = {
  name: string;
  aisle: string;
  climate: number;
  veganAlternative: string;
  description: string;
};

export const ingredientWithQuantityType: SnippetType = {
  name: "Ingredient with quantity",
  icon: "",
  color: "#ffc107",
  highlight: (text, existing): Highlight[] => {
    const result: Highlight[] = [];
    const ingredients = existing.filter(
      (sug) => sug.snippetTypeId === INGREDIENT_TYPE
    );
    for (const ingredient of ingredients) {
      const leftBound = findPreviousCharacter(ingredient.span[0], "\n", text);
      const rightBound = findNextCharacter(ingredient.span[1], "\n", text);
      const quantitiesOnSameLine = existing.filter(
        (sug) =>
          sug.snippetTypeId === QUANTITY_TYPE &&
          spanOverlaps([leftBound, rightBound], sug.span)
      );
      if (quantitiesOnSameLine.length === 0) {
        continue;
      }
      const closestQuantity = sortBy(quantitiesOnSameLine, (quantity) =>
        Math.abs(quantity.span[0] - ingredient.span[0])
      )[0];
      result.push({
        snippetTypeId: INGREDIENT_WITH_QUANTITY_TYPE,
        span: [
          Math.min(ingredient.span[0], closestQuantity.span[0]),
          Math.max(ingredient.span[1], closestQuantity.span[1]),
        ],
        data: {},
        refs: {
          ingredient: ingredient,
          quantity: closestQuantity,
        },
      });
    }
    return result;
  },

  parse: (text: string) => {},

  properties: [],
};
