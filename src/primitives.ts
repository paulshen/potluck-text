import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable, runInAction } from "mobx";
import { nanoid } from "nanoid";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];

const DEFAULT_EDITOR_CONTENT = `# Chili

Bring 2 pounds low fat (~90/10) ground chuck beef to room temperature, and season with 1 Tbsp onion powder, 2 tsp salt, and 3/8 tsp garlic powder.

Warm bacon fat or cooking oil in large pot over high heat, and add seasoned meat. Break meat into small pieces, and stir until meat is browned and liquid becomes gravy-like.

Add 12oz ipa beer or hop water, 8oz can tomato sauce/puree, 3 Tbl ground ancho chili powder, 1 tsp ground cumin, 1 tsp paprika, 1 tsp unsweetened cocoa powder, 1/4 tsp dried oregano, 1/4 tsp ground cayenne pepper, and 1/8 tsp ground cinnamon to meat mixture, and simmer over low heat for 2-3 hours, stirring regularly.

Add 1/8 Cup diced poblano peppers to mixture, and continue to simmer for 2 hours, stirring regularly.

Optionally rinse 1 can red kidney beans and 1 can black beans with water and drain. Gently stir beans into mixture, keeping the beans intact.

Simmer on low until liquid as evaporated. Chili is ready once flavors are blended and texture is to your liking.

Serve in bowl and garnish to taste with grated cheddar, avocado, sour cream, jalapeño, salsa, tortilla chips, Fritos, or corn bread.
`;

export const INGREDIENT_TYPE = "ingredient";
const DEFAULT_SNIPPET_TYPES: SnippetType[] = [
  {
    id: INGREDIENT_TYPE,
    name: "Ingredient",
    icon: "🥕",
    color: "#ffc107",
  },
];

const FIRST_TEXT_ID = "text-id-1";
export const textEditorStateMobx = observable.map<string, EditorState>(
  {
    [FIRST_TEXT_ID]: EditorState.create({ doc: DEFAULT_EDITOR_CONTENT }),
  },
  { deep: false }
);
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

export type SnippetType = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Snippet = {
  spatialComponentType: SpatialComponentType.Snippet;

  id: string;
  snippetTypeId: string;
  textId: string;
  span: Span;
  position: Position;

  /** { [columnId]: data } */
  data: { [key: string]: any };
};
export type SnippetGroup = {
  spatialComponentType: SpatialComponentType.SnippetGroup;
  id: string;
  position: Position;
  snippetIds: string[];
  /** Definitions for additional data to record for each annotation */
  extraColumns: ColumnDefinition[];
};

export type SnippetSuggestion = { id: string; span: Span };
export const snippetSuggestionsMobx = observable.map<
  string,
  SnippetSuggestion[]
>({});
// @ts-ignore EXAMPLE
window.exampleSetSnippetSuggestion = (
  textId: string = FIRST_TEXT_ID,
  suggestions: SnippetSuggestion[] = [
    { id: "1", span: [42, 59] },
    { id: "2", span: [104, 116] },
    { id: "3", span: [124, 128] },
    { id: "4", span: [142, 155] },
  ]
) => {
  runInAction(() => {
    snippetSuggestionsMobx.set(textId, suggestions);
  });
};

export type SpatialComponent = Snippet | SnippetGroup;
export const getGroupWidth = (group: SnippetGroup): number => {
  return (group.extraColumns.length + 1) * GROUP_COLUMN_WIDTH;
};

export const spatialComponentsMobx = observable<SpatialComponent>([]);
export const snippetTypesMobx = observable<SnippetType>(DEFAULT_SNIPPET_TYPES);
export const selectedSpatialComponentsMobx = observable<string>([]);

export type DragState = {
  spatialComponentIds: string[];
  snippetsOverGroupId: string | undefined;
};
export const dragStateBox = observable.box<DragState | undefined>(undefined);

export const CHAR_WIDTH = 8.5;
export const GROUP_COLUMN_WIDTH = 192;
export const TOKEN_HEIGHT = 28;
export const GROUP_TOKEN_ROW_GAP = 4;
export const GROUP_TOKEN_COLUMN_GAP = 4;
