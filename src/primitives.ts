import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable } from "mobx";
import { nanoid } from "nanoid";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];

const DEFAULT_EDITOR_CONTENT = `
# Chili

Bring 2 pounds low fat (~90/10) ground chuck beef to room temperature, and season with 1 Tbsp onion powder, 2 tsp salt, and 3/8 tsp garlic powder.

Warm bacon fat or cooking oil in large pot over high heat, and add seasoned meat. Break meat into small pieces, and stir until meat is browned and liquid becomes gravy-like.

Add 12oz ipa beer or hop water, 8oz can tomato sauce/puree, 3 Tbl ground ancho chili powder, 1 tsp ground cumin, 1 tsp paprika, 1 tsp unsweetened cocoa powder, 1/4 tsp dried oregano, 1/4 tsp ground cayenne pepper, and 1/8 tsp ground cinnamon to meat mixture, and simmer over low heat for 2-3 hours, stirring regularly.

Add 1/8 Cup diced poblano peppers to mixture, and continue to simmer for 2 hours, stirring regularly.

Optionally rinse 1 can red kidney beans and 1 can black beans with water and drain. Gently stir beans into mixture, keeping the beans intact.

Simmer on low until liquid as evaporated. Chili is ready once flavors are blended and texture is to your liking.

Serve in bowl and garnish to taste with grated cheddar, avocado, sour cream, jalapeño, salsa, tortilla chips, Fritos, or corn bread.
`;

export const textEditorStateMobx = observable.map<string, EditorState>(
  {
    [nanoid()]: EditorState.create({ doc: DEFAULT_EDITOR_CONTENT }),
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
export type SnippetToken = {
  type: SpatialComponentType.Snippet;
  textId: string;
  id: string;
  span: Span;
  position: Position;

  /** { [columnId]: data } */
  extraData: { [key: string]: any };
};
export type SnippetGroup = {
  type: SpatialComponentType.SnippetGroup;
  id: string;
  position: Position;
  snippetIds: string[];
  /** Definitions for additional data to record for each annotation */
  extraColumns: ColumnDefinition[];
};

export type SpatialComponent = SnippetToken | SnippetGroup;
export const getGroupWidth = (group: SnippetGroup): number => {
  return (group.extraColumns.length + 1) * GROUP_COLUMN_WIDTH;
};

export const spatialComponentsMobx = observable<SpatialComponent>([]);
export const selectedSpatialComponentsMobx = observable<string>([]);

export type DragState = {
  spatialComponentIds: string[];
  snippetsOverGroupId: string | undefined;
};
export const dragStateBox = observable.box<DragState | undefined>(undefined);

export const CHAR_WIDTH = 7.2;
export const GROUP_COLUMN_WIDTH = 192;
export const TOKEN_HEIGHT = 24;
export const GROUP_TOKEN_ROW_GAP = 4;
export const GROUP_TOKEN_COLUMN_GAP = 4;
