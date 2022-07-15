import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { action, comparer, observable, reaction } from "mobx";
import { ingredientSnippetType } from "./snippetTypes/ingredients";
import { parseQuantity, quantitySnippetType } from "./snippetTypes/quantities";
import { ingredientWithQuantityType } from "./snippetTypes/ingredientWithQuantity";
import { EditorView } from "codemirror";
import { exeriseNameType } from "./snippetTypes/exerciseName";
import { exerciseActivityType } from "./snippetTypes/exerciseActivity";
import { setsAndRepsType } from "./snippetTypes/setsAndReps";
// @ts-ignore
import rawIngredients from "./snippetTypes/ingredients.csv";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];

const DEFAULT_EDITOR_CONTENT = `Grilled Gochujang Pork With Fresh Sesame Kimchi

Pork shoulder is often prepared as a large roast, requiring hours of cooking until it’s tender. But if you slice it thinly and pound it, the meat quickly absorbs this savory gochujang marinade and cooks up in no time. The spicy pork is balanced by a cool and crisp sesame kimchi, eaten fresh like a salad rather than fermented like traditional preparations. Baby bok choy stands in for the usual napa cabbage, and it’s coated in a vibrant sauce of garlic, ginger, gochugaru, fish sauce and nutty sesame oil. Tuck any leftover pork and kimchi into sandwiches the next day, garnished with tomatoes and mayonnaise.

2 tablespoons gochugaru
2 tablespoons distilled white vinegar
2 tablespoons toasted sesame oil
3 teaspoons grated garlic
2 teaspoons grated peeled ginger
1 teaspoon kosher salt, plus more for seasoning
½ teaspoon fish sauce
1 tablespoon plus ½ teaspoon granulated sugar
1½ pounds baby bok choy, quartered lengthwise
3 scallions, halved lengthwise and thinly sliced on the diagonal
2 tablespoons gochujang (Korean chile paste)
2 tablespoons neutral oil, such as safflower or canola
1 tablespoon low-sodium soy sauce
1 teaspoon ground black pepper, plus more for seasoning
2 pounds pork shoulder, thinly sliced crosswise and pounded
1 large white onion, peeled and sliced into ¼-inch-thick rings
Steamed rice, for serving

Preparation
Step 1
In a large bowl, combine the gochugaru, vinegar, sesame oil, 1 teaspoon of the garlic, 1 teaspoon of the ginger, 1 teaspoon salt, the fish sauce and ½ teaspoon of the sugar; mix well. Add bok choy and scallions, and toss with your hands, working the sauce in between and all over the leaves.

Step 2
Heat a grill to medium-high or heat a stovetop griddle pan over medium-high. In a large bowl, combine the gochujang, neutral oil, soy sauce, 1 teaspoon black pepper and the remaining 2 teaspoons garlic, 1 teaspoon ginger and 1 tablespoon sugar; mix well. Very lightly season the pork with salt and pepper. Add pork and onion to the marinade and toss, gently massaging the marinade all over the meat (The meat does not need to rest in the marinade before it is grilled, but it can be marinated for up to 3 hours.)

Step 3
Grill the pork and onion, in batches if necessary, until nicely charred and caramelized around the edges, and the pork is cooked through, about 3 minutes per side. Transfer to a serving platter.

Step 4
Serve the grilled pork and onions with the fresh sesame kimchi and rice on the side.`;

export const INGREDIENT_TYPE = "ingredient";
export const INGREDIENT_REFERENCE_TYPE = "ingredient_reference";
export const QUANTITY_TYPE = "quantity";
export const INGREDIENT_WITH_QUANTITY_TYPE = "ingredient_with_quantity";
export const EXERCISE_NAME_TYPE = "exercise_name";
export const SETS_AND_REPS_TYPE = "sets_and_reps";
export const EXERCISE_ACTIVITY_TYPE = "exercise_activity";

const DEFAULT_HIGHLIGHTER_TYPES: { [key: string]: HighlighterType } = {
  [QUANTITY_TYPE]: quantitySnippetType,
  [INGREDIENT_TYPE]: ingredientSnippetType,
  [INGREDIENT_WITH_QUANTITY_TYPE]: ingredientWithQuantityType,
  [EXERCISE_NAME_TYPE]: exeriseNameType,
  [SETS_AND_REPS_TYPE]: setsAndRepsType,
  [EXERCISE_ACTIVITY_TYPE]: exerciseActivityType,
};
export const FIRST_TEXT_ID = "text-id-1";
export const textEditorStateMobx = observable.map<string, EditorState>(
  {
    [FIRST_TEXT_ID]: EditorState.create({ doc: DEFAULT_EDITOR_CONTENT }),
  },
  { deep: false }
);
export const textEditorViewsMap: { [textId: string]: EditorView } = {};
export const dragNewSnippetEmitter = new EventEmitter();

export type HighlighterType = {
  name: string;
  icon: string;
  color: string;

  /** Given a whole document, return highlights with structured data */
  highlight: (text: string, existingSuggestions: Highlight[]) => Highlight[];

  /** Given text for a single snippet, return structured data for the snippet */
  parse: (text: string) => any;

  properties: any[];
};

export type Highlight = {
  span: Span;
  highlighterTypeId: string;
  data: any;
  refs: { [key: string]: Highlight };
};

export enum HighlighterParserType {
  ListMatchHighlighter,
  RegexHighlighter,
  NextToHighlighter,
  CustomHighlighter,
}

export type HighlighterParser =
  | {
      type: HighlighterParserType.ListMatchHighlighter;
      list: string[];
    }
  | {
      type: HighlighterParserType.RegexHighlighter;
      regex: string;
    }
  | {
      type: HighlighterParserType.NextToHighlighter;
      firstHighlightTypeId: string;
      secondHighlightTypeId: string;
      maxDistanceBetween: number;
    }
  | {
      type: HighlighterParserType.CustomHighlighter;
      parser: (text: string, existingHighlights: Highlight[]) => Highlight[];
    };

export type Highlighter = {
  id: string;
  name: string;
  icon: string;
  color: string;
  parser: HighlighterParser;
  postProcess?: (highlight: Highlight, text: string) => Highlight;
};

export const BUILT_IN_HIGHLIGHTERS: Highlighter[] = [
  {
    id: "ingredient",
    name: "Ingredient",
    icon: "🥕",
    color: "hsla(212, 42%, 40%, 1)",
    parser: {
      type: HighlighterParserType.ListMatchHighlighter,
      list: rawIngredients.map((line: any) => line.name),
    },
  },
  {
    id: "quantity",
    name: "Quantity",
    icon: "⚖️",
    color: "hsl(349deg 80% 48%)",
    parser: {
      type: HighlighterParserType.RegexHighlighter,
      regex:
        "(\\d|\\/|¼|½|¾|⅛|\\.)+\\s?(g|gram|oz|tsp|Tbsp|pound|cup|cup|can|teaspoon|tablespoon)s?\\b",
    },
    postProcess: (highlight: Highlight, text: string) => ({
      ...highlight,
      data: parseQuantity(text.slice(highlight.span[0], highlight.span[1])),
    }),
  },
  {
    id: "ingredient_with_quantity",
    name: "Ingredient with quantity",
    icon: "",
    color: "#059669",
    parser: {
      type: HighlighterParserType.NextToHighlighter,
      firstHighlightTypeId: "quantity",
      secondHighlightTypeId: "ingredient",
      maxDistanceBetween: 50,
    },
  },
];

/** An AntiHighlight is a region where highlights have been removed and they should not return */
export type AntiHighlight = {
  textId: string;
  span: Span;
};

export const highlightersMobx = observable.array<Highlighter>(
  BUILT_IN_HIGHLIGHTERS
);

export const hiddenHighlighterIdsMobx = observable.set<string>([]);
reaction(
  () => highlightersMobx.map((h) => h.id),
  action((highlighterIds) => {
    for (const hiddenHighlighterId of hiddenHighlighterIdsMobx) {
      if (!highlighterIds.includes(hiddenHighlighterId)) {
        hiddenHighlighterIdsMobx.delete(hiddenHighlighterId);
      }
    }
  }),
  { equals: comparer.structural }
);

// TODO: remove this
export const highlighterTypesMobx = observable.map<string, HighlighterType>(
  DEFAULT_HIGHLIGHTER_TYPES
);

export const antiHighlightsMobx = observable.array<AntiHighlight>([]);

export const CHAR_WIDTH = 8.5;
export const TOKEN_HEIGHT = 28;
export const GROUP_TOKEN_ROW_GAP = 8;
export const GROUP_TOKEN_COLUMN_GAP = 4;
