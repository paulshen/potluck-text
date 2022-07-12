import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable, reaction } from "mobx";
import { ingredientSnippetType } from "./snippetTypes/ingredients";
import { quantitySnippetType } from "./snippetTypes/quantities";
import { EditorView } from "codemirror";

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
const DEFAULT_SNIPPET_TYPES: { [key: string]: SnippetType } = {
  [INGREDIENT_TYPE]: ingredientSnippetType,
  [QUANTITY_TYPE]: quantitySnippetType,
};
const DEFAULT_SNIPPET_TYPE_CONFIGURATION: {
  [key: string]: SnippetTypeViewConfiguration;
} = {
  [INGREDIENT_TYPE]: {
    inlineVisiblePropertyIds: [],
  },
  [QUANTITY_TYPE]: {
    inlineVisiblePropertyIds: [],
  },
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

export type ColumnDefinition = {
  id: string;
  name: string;
  formula?: string;
};

export enum SpatialComponentType {
  Snippet,
  SnippetGroup,
}

export type SnippetPropertyAction = {
  label: string;
  available: (snippet: Snippet) => boolean;
  handler: (snippet: Snippet) => void;
};

export type SnippetProperty = {
  id: string;
  name: string;
  type: "number" | "string" | "boolean";
  actions?: SnippetPropertyAction[];
};

export type SnippetType = {
  name: string;
  icon: string;
  color: string;

  /** Given a whole document, suggest character indexes that could become snippets of this type */
  suggest: (text: string) => SnippetSuggestion[];

  /** Given text for a single snippet, return structured data for the snippet */
  parse: (text: string) => any;

  properties: SnippetProperty[];
};

export type SnippetTypeViewConfiguration = {
  /** IDs of properties that should be visible inline */
  inlineVisiblePropertyIds: string[];
};

export type Snippet = {
  id: string;
  snippetTypeId: string;
  textId: string;
  span: Span;
  /** { [columnId]: data } */
  data: { [key: string]: any };
};

export type SnippetOnCanvas = {
  spatialComponentType: SpatialComponentType.Snippet;
  id: string;
  snippetId: string;
  position: Position;
};

export type SnippetGroup = {
  spatialComponentType: SpatialComponentType.SnippetGroup;
  id: string;
  position: Position;
  snippetIds: string[];
  /** Definitions for additional data to record for each annotation */
  extraColumns: ColumnDefinition[];
};

export type SnippetSuggestion = {
  span: Span;
  snippetTypeId: string;
};

export type SpatialComponent = SnippetOnCanvas | SnippetGroup;
export const getGroupWidth = (group: SnippetGroup): number => {
  return (group.extraColumns.length + 1) * GROUP_COLUMN_WIDTH;
};

export const snippetTypesMobx = observable.map<string, SnippetType>(
  DEFAULT_SNIPPET_TYPES
);
export const snippetsMobx = observable.map<string, Snippet>({});
export const snippetTypeViewConfigurationsMobx = observable.map<
  string,
  SnippetTypeViewConfiguration
>(DEFAULT_SNIPPET_TYPE_CONFIGURATION);

export const spatialComponentsMobx = observable.array<SpatialComponent>([]);
export const selectedSpatialComponentsMobx = observable.array<string>([]);
export const spatialHoverSnippetIdBox =
  observable.box<string | undefined>(undefined);

export type DragState = {
  spatialComponentIds: string[];
  snippetsOverGroupId: string | undefined;
};
export const dragStateBox = observable.box<DragState | undefined>(undefined);

export const CHAR_WIDTH = 8.5;
export const GROUP_COLUMN_WIDTH = 192;
export const TOKEN_HEIGHT = 28;
export const GROUP_TOKEN_ROW_GAP = 8;
export const GROUP_TOKEN_COLUMN_GAP = 4;
