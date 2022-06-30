import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable } from "mobx";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];
export const editorStateDoc = observable.box<EditorState>();
export const dragNewAnnotationEmitter = new EventEmitter();

export enum SpatialComponentType {
  Annotation,
  AnnotationGroup,
}
export type AnnotationToken = {
  type: SpatialComponentType.Annotation;
  id: string;
  span: Span;
  position: Position;
};
export type AnnotationGroup = {
  type: SpatialComponentType.AnnotationGroup;
  id: string;
  position: Position;
  annotationIds: string[];
};
export type SpatialComponent = AnnotationToken | AnnotationGroup;
export const spatialComponentsMobx = observable<SpatialComponent>([]);
export const selectedSpatialComponentsMobx = observable<string>([]);

export const CHAR_WIDTH = 7.2;
export const GROUP_WIDTH = 192;
export const TOKEN_HEIGHT = 24;
export const GROUP_TOKEN_GAP = 4;
