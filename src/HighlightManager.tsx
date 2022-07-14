import { observable } from "mobx";
import { observer } from "mobx-react-lite";
import { Highlight } from "./primitives";
// @ts-ignore
import rawIngredients from "./snippetTypes/ingredients.csv";
import { spanOverlaps } from "./utils";

export enum HighlighterType {
  ListMatchHighlighter,
  RegexHighlighter,
  NextToHighlighter,
  CustomHighlighter,
}

export type HighlighterParser =
  | {
      type: HighlighterType.ListMatchHighlighter;
      list: string[];
    }
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
      type: HighlighterType.ListMatchHighlighter,
      list: rawIngredients.map((line: any) => line.name),
    },
  },
]);

export function parseWithHighlighter(
  highlighter: Highlighter,
  text: string,
  existingHighlights: Highlight[]
): Highlight[] {
  const { parser } = highlighter;
  switch (parser.type) {
    case HighlighterType.ListMatchHighlighter: {
      const matches: Highlight[] = [];
      // We could probably do this faster if we combined all the known strings into one regex,
      // but this is simpler to reason about and seems fast enough for now.
      for (const stringTemplate of parser.list) {
        for (const match of text.matchAll(
          new RegExp(`\\b${stringTemplate}\\b`, "ig")
        )) {
          const from = match.index ?? 0;
          const to = from + match[0].length;
          // Only add the match if it doesn't overlap with other existing matches.
          // This prevents weird overlapping matches
          if (
            matches.some((existing) => spanOverlaps(existing.span, [from, to]))
          ) {
            continue;
          }

          matches.push({
            span: [from, to],
            snippetTypeId: highlighter.id,
            data: {},
            refs: {},
          });
        }
      }
      return matches;
    }
    case HighlighterType.RegexHighlighter: {
      const regex = new RegExp(parser.regex, "g");
      const matches: Highlight[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        const length = match[0].length;
        matches.push({
          snippetTypeId: highlighter.id,
          span: [regex.lastIndex - length, regex.lastIndex],
          data: {},
          refs: {},
        });
      }
      return matches;
    }
    case HighlighterType.NextToHighlighter: {
      const {
        firstHighlightTypeId,
        secondHighlightTypeId,
        maxDistanceBetween,
      } = parser;
      const rv: [Highlight, Highlight][] = [];
      const sortedHighlights = existingHighlights
        .filter(
          (h) =>
            h.snippetTypeId === firstHighlightTypeId ||
            h.snippetTypeId === secondHighlightTypeId
        )
        .sort((a, b) => a.span[0] - b.span[0]);
      for (let i = 0; i < sortedHighlights.length - 1; i++) {
        const highlight = sortedHighlights[i];
        if (highlight.snippetTypeId !== firstHighlightTypeId) {
          continue;
        }
        const nextHighlight = sortedHighlights[i + 1];
        if (nextHighlight.snippetTypeId !== secondHighlightTypeId) {
          continue;
        }
        if (
          nextHighlight.span[0] > highlight.span[1] &&
          nextHighlight.span[0] - highlight.span[1] < maxDistanceBetween
        ) {
          rv.push([highlight, nextHighlight]);
        }
      }
      return rv.map(([first, second]) => ({
        snippetTypeId: highlighter.id,
        span: [first.span[0], second.span[1]],
        data: {},
        refs: {
          [firstHighlightTypeId]: first,
          [secondHighlightTypeId]: second,
        },
      }));
    }
  }
  throw new Error();
}

const Highlighter = observer(
  ({ highlighter }: { highlighter: Highlighter }) => {
    return (
      <div>
        <div className="flex gap-2">
          <div>{highlighter.name}</div>
          <div>{highlighter.icon}</div>
          <div>{highlighter.color}</div>
        </div>
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
