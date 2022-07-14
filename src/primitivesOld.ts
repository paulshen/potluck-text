import { observable } from "mobx";
import { Position, Span } from "./primitives";

export enum SpatialComponentType {
  Snippet,
  SnippetGroup,
}

export type SnippetOnCanvas = {
  spatialComponentType: SpatialComponentType.Snippet;
  id: string;
  snippetId: string;
  position: Position;
};

export type ColumnDefinition = {
  id: string;
  name: string;
  formula?: string;
};

export type SnippetGroup = {
  spatialComponentType: SpatialComponentType.SnippetGroup;
  id: string;
  position: Position;
  snippetIds: string[];
  /** Definitions for additional data to record for each annotation */
  extraColumns: ColumnDefinition[];
};

export type SpatialComponent = SnippetOnCanvas | SnippetGroup;

export type SnippetTypeViewConfiguration = {
  /** IDs of properties that should be visible inline */
  inlineVisiblePropertyIds: string[];
};

const DEFAULT_SNIPPET_TYPE_CONFIGURATION: {
  [key: string]: SnippetTypeViewConfiguration;
} = {};

export const snippetsMobx = observable.map<string, Snippet>({});
export const snippetTypeViewConfigurationsMobx = observable.map<
  string,
  SnippetTypeViewConfiguration
>(DEFAULT_SNIPPET_TYPE_CONFIGURATION);
export const spatialComponentsMobx = observable.array<SpatialComponent>([]);
export const selectedSpatialComponentsMobx = observable.array<string>([]);

export const GROUP_COLUMN_WIDTH = 192;
export const getGroupWidth = (group: SnippetGroup): number => {
  return (group.extraColumns.length + 1) * GROUP_COLUMN_WIDTH;
};

export type DragState = {
  spatialComponentIds: string[];
  snippetsOverGroupId: string | undefined;
};
export const dragStateBox = observable.box<DragState | undefined>(undefined);

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

export type Snippet = {
  id: string;
  snippetTypeId: string;
  textId: string;
  span: Span;
  /** { [columnId]: data } */
  data: { [key: string]: any };
};
