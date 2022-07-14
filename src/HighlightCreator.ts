import { Highlight } from "./primitives";

export enum HighlighterType {
  RegexHighlighter,
  NextToHighlighter,
}

type HighlighterSchema = {
  id: string;
  postProcess?: (highlights: Highlight[], text: string) => Highlight[];
} & (
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
);

export function createHighlighter(
  schema: HighlighterSchema
): (text: string, existingHighlights: Highlight[]) => Highlight[] {
  switch (schema.type) {
    case HighlighterType.RegexHighlighter: {
      return (text: string, existingHighlights: Highlight[]) => {
        const regex = new RegExp(schema.regex, "g");
        const matches: Highlight[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
          const length = match[0].length;
          matches.push({
            snippetTypeId: schema.id,
            span: [regex.lastIndex - length, regex.lastIndex],
            data: {},
            refs: {},
          });
        }
        return schema.postProcess?.(matches, text) ?? matches;
      };
    }
    case HighlighterType.NextToHighlighter: {
      const {
        firstHighlightTypeId,
        secondHighlightTypeId,
        maxDistanceBetween,
      } = schema;
      return (text: string, existingHighlights: Highlight[]) => {
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
          snippetTypeId: schema.id,
          span: [first.span[0], second.span[1]],
          data: {},
          refs: {
            [firstHighlightTypeId]: first,
            [secondHighlightTypeId]: second,
          },
        }));
      };
    }
  }
  throw new Error();
}
