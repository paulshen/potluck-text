import { observable } from "mobx";
import { observer } from "mobx-react-lite";
import { Highlight } from "./primitives";

export enum HighlighterType {
  RegexHighlighter,
  NextToHighlighter,
  CustomHighlighter,
}

export type HighlighterParser =
  | {
      type: HighlighterType.RegexHighlighter;
      regex: string;
    }
  | {
      type: HighlighterType.NextToHighlighter;
      firstHighlightTypeId: string;
      secondHighlightTypeId: string;
      maxDistanceBetween: number;
    }
  | {
      type: HighlighterType.CustomHighlighter;
      parser: (text: string, existingHighlights: Highlight[]) => Highlight[];
    };

export type HighlighterConfig = {};

export type Highlighter = {
  id: string;
  name: string;
  icon: string;
  color: string;
  parser: HighlighterParser;
};

export const highlightersMobx = observable.array<Highlighter>([
  {
    id: "ingredient",
    name: "Ingredient",
    icon: "ingredient",
    color: "#ff0000",
    parser: {
      type: HighlighterType.RegexHighlighter,
      regex: "\\b(apples|bananas|carrots)\\b",
    },
  },
]);

const Highlighter = observer(
  ({ highlighter }: { highlighter: Highlighter }) => {
    return (
      <div>
        <div>{highlighter.name}</div>
        <div>{highlighter.icon}</div>
        <div>{highlighter.color}</div>
      </div>
    );
  }
);

export const HighlightManager = observer(() => {
  return (
    <div>
      {highlightersMobx.map((highlighter) => (
        <Highlighter highlighter={highlighter} key={highlighter.id} />
      ))}
    </div>
  );
});
