import { observable } from "mobx";

export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];
export type DragAnnotation = {
  id: string;
  position: [x: number, y: number];
  span: Span;
};
export const annotationsMobx = observable<DragAnnotation>([]);
export const selectedAnnotationsMobx = observable<string>([]);
