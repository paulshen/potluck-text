import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable } from "mobx";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];
export const textEditorStateMobx = observable.map<string, EditorState>(
  {},
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
