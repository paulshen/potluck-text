import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable } from "mobx";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];
export const editorStateDoc = observable.box<EditorState | undefined>(
  undefined,
  { deep: false }
);
export const dragNewSnippetEmitter = new EventEmitter();

export enum SpatialComponentType {
  Snippet,
  SnippetGroup,
}
export type SnippetToken = {
  type: SpatialComponentType.Snippet;
  id: string;
  span: Span;
  position: Position;
};
export type SnippetGroup = {
  type: SpatialComponentType.SnippetGroup;
  id: string;
  position: Position;
  snippetIds: string[];
};
export type SpatialComponent = SnippetToken | SnippetGroup;
export const spatialComponentsMobx = observable<SpatialComponent>([]);
export const selectedSpatialComponentsMobx = observable<string>([]);

export type DragState = {
  spatialComponentIds: string[];
  snippetsOverGroupId: string | undefined;
};
export const dragStateBox = observable.box<DragState | undefined>(undefined);

export const CHAR_WIDTH = 7.2;
export const GROUP_WIDTH = 192;
export const TOKEN_HEIGHT = 24;
export const GROUP_TOKEN_GAP = 4;
