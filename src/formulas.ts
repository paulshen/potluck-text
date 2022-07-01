// This file is a super-stubby formula executor.
// It only allows one hardcoded formula for now.

export function executeFormula(formula: string, text: string, extraData: any) {
  if (formula === "Lookup(text, Aisle)") {
    return lookupIngredientByAisle(text);
  } else if (formula === "Checkbox()") {
    return false;
  } else {
    return undefined;
  }
}

const lookup: { [key: string]: string } = {
  meat: "🍗 meat",
  beef: "🍗 meat",
  "onion powder": "🌶 spices",
  "garlic powder": "🌶 spices",
  bacon: "🍗 meat",
  beer: "🍺 alcohol",
  cumin: "🌶 spices",
  paprika: "🌶 spices",
  "cocoa powder": "🌶 spices",
  "cayenne pepper": "🌶 spices",
  oregano: "🌶 spices",
  cinnamon: "🌶 spices",
  "poblano peppers": "🥬 produce",
  "kidney beans": "🥫 pantry",
  "cooking oil": "🥫 pantry",
  salt: "🥫 pantry",
  "black beans": "🥫 pantry",
  avocado: "🥬 produce",
};

export const lookupIngredientByAisle = (ingredientText: string) => {
  for (const ingredient of Object.keys(lookup)) {
    if (ingredientText.includes(ingredient)) {
      return lookup[ingredient];
    }
  }
  return undefined;
};

export function formulaIsValid(formula: string | undefined) {
  return (
    formula === "" ||
    formula === undefined ||
    formula === "Lookup(text, Aisle)" ||
    formula === "Checkbox()"
  );
}
