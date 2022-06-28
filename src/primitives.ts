import {EditorState} from "@codemirror/state";
import {EventEmitter} from "eventemitter3";
import {observable} from "mobx";
import {nanoid} from "nanoid";

export type Position = [x: number, y: number];
export type Rect = [x: number, y: number, width: number, height: number];
export type Span = [from: number, to: number];

export enum AnnotationType {
  Ingredient,
  Duration,
}

const EXAMPLE_DOC = EditorState.create({
  doc:
    `# Chocolate Cookies

- 100g milk chocolate
- 100g white sugar
- 100g butter
- 300g flour
- 1 tsp baking soda
- 2 eggs

# Dark chocolate Cookies

- 100 g dark chocolate
- 50 g brown sugar
- 50 g butter
- 50 g white sugar
- 200 g flour
- 2 tsp baking soda
- 1 egg

# Ingredients

- egg
- baking soda
- flour
- sugar
`
})

export const editorStateDoc = observable.box<EditorState>();

export const dragNewAnnotationEmitter = new EventEmitter();

export type DragStack = {
  id: string;
  annotations: Annotation[]
  position: [x: number, y: number],
  isExpanded: boolean,
}

export type Annotation = {
  id: string;
  span: Span;
  type: AnnotationType | undefined
}

export type DragAnnotation = {
  id: string;
  position: [x: number, y: number];
  span: Span;
  type: AnnotationType | undefined;
};

const EXAMPLE_ANNOTATIONS: DragAnnotation[] = [{
  "id": "z1IdEerj-24hp6dkpWo8L",
  "span": [23, 42],
  "position": [562.4453125, 87]
}, { "id": "HoP5aBg35ETU5DV6LChfr", "span": [45, 61], "position": [553.4453125, 149] }, {
  "id": "nzboEkYq7B70mIY1YEbjv",
  "span": [64, 75],
  "position": [576.4453125, 205]
}, { "id": "0zFEXrsGtggWmqSUDVUT8", "span": [78, 88], "position": [569.4453125, 256] }, {
  "id": "glYGdgXsnCkfLFQ_DXFGr",
  "span": [91, 108],
  "position": [567.4453125, 311]
}, {
  "id": "Z6DdK2DeSwfSwq5QEC2AG",
  "span": [111, 117],
  "position": [563.4453125, 351]
}, {
  "id": "7oeEHgpo8IwgpPea0Ep-c",
  "span": [147, 167],
  "position": [852.4453125, 86]
}, {
  "id": "_os2PFvvI2HVwHCnISWM3",
  "span": [170, 186],
  "position": [845.4453125, 128]
}, {
  "id": "YTk6U6gydBhKhG1RLsSTK",
  "span": [189, 200],
  "position": [858.4453125, 175]
}, {
  "id": "4sM_hBtPdHV77FSYYnW26",
  "span": [203, 219],
  "position": [855.4453125, 224]
}, {
  "id": "yr1w2xD8lh39J1S4QapN7",
  "span": [222, 233],
  "position": [857.4453125, 264]
}, {
  "id": "lN5bjINu7VuQWZN_IYi8P",
  "span": [236, 253],
  "position": [853.4453125, 307]
}, {
  "id": "F2mpJNX-u8Yy7DYPyvUwo",
  "span": [256, 261],
  "position": [850.4453125, 362]
}
] as DragAnnotation[]

export const annotationsMobx = observable<DragAnnotation>([]);

export const stacksMobx = observable<DragStack>([]);

export const selectedAnnotationsMobx = observable<string>([]);

export const CHAR_WIDTH = 7.2;
