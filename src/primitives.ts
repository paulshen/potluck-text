import { EditorState } from "@codemirror/state";
import { EventEmitter } from "eventemitter3";
import { observable } from "mobx";

export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];
export enum AnnotationType {
  Ingredient,
  Duration,
}
export const editorStateDoc = observable.box<EditorState>();
export const dragNewAnnotationEmitter = new EventEmitter();

export type DragAnnotation = {
  id: string;
  position: [x: number, y: number];
  span: Span;
  type: AnnotationType | undefined;
};
export const annotationsMobx = observable<DragAnnotation>([]);
export const selectedAnnotationsMobx = observable<string>([]);
