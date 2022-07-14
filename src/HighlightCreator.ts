import { Text } from "@codemirror/state";
import { Highlight, Span } from "./primitives";

export enum HighlighterSchemaType {
  RegexHighlighter,
  NextToHighlighter,
  SameLineHighlighter,
}

type HighlighterSchema = {
  id: string;
  postProcess?: (highlights: Highlight[], text: string) => Highlight[];
} & (
  | {
      type: HighlighterSchemaType.RegexHighlighter;
      regex: string;
    }
  | {
      type: HighlighterSchemaType.NextToHighlighter;
      firstHighlightTypeId: string;
      secondHighlightTypeId: string;
      maxDistanceBetween: number;
    }
  | {
      type: HighlighterSchemaType.SameLineHighlighter;
      highlightTypeIds: string[];
    }
);

function getSpanForMultipleSpans(spans: Span[]): Span {
  return [
    Math.min(...spans.map((span) => span[0])),
    Math.max(...spans.map((span) => span[1])),
  ];
}

export function createHighlighter(
  schema: HighlighterSchema
): (text: string, existingHighlights: Highlight[]) => Highlight[] {
  switch (schema.type) {
    case HighlighterSchemaType.RegexHighlighter: {
      return (text: string, existingHighlights: Highlight[]) => {
        const regex = new RegExp(schema.regex, "g");
        const matches: Highlight[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
          const length = match[0].length;
          matches.push({
            highlighterTypeId: schema.id,
            span: [regex.lastIndex - length, regex.lastIndex],
            data: {},
            refs: {},
          });
        }
        return schema.postProcess?.(matches, text) ?? matches;
      };
    }
    case HighlighterSchemaType.NextToHighlighter: {
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
              h.highlighterTypeId === firstHighlightTypeId ||
              h.highlighterTypeId === secondHighlightTypeId
          )
          .sort((a, b) => a.span[0] - b.span[0]);
        for (let i = 0; i < sortedHighlights.length - 1; i++) {
          const highlight = sortedHighlights[i];
          if (highlight.highlighterTypeId !== firstHighlightTypeId) {
            continue;
          }
          const nextHighlight = sortedHighlights[i + 1];
          if (nextHighlight.highlighterTypeId !== secondHighlightTypeId) {
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
          highlighterTypeId: schema.id,
          span: [first.span[0], second.span[1]],
          data: {},
          refs: {
            [firstHighlightTypeId]: first,
            [secondHighlightTypeId]: second,
          },
        }));
      };
    }
    case HighlighterSchemaType.SameLineHighlighter: {
      const { highlightTypeIds } = schema;
      return (text: string, existingHighlights: Highlight[]) => {
        const cmText = Text.of(text.split("\n"));
        const highlightsByLine: { [lineNumber: number]: Highlight[] } = {};
        for (const snippet of existingHighlights) {
          const line = cmText.lineAt(snippet.span[0]);
          if (highlightsByLine[line.number] === undefined) {
            highlightsByLine[line.number] = [];
          }
          highlightsByLine[line.number].push(snippet);
        }
        const rv: Highlight[][] = [];
        for (const [lineNumber, lineSnippets] of Object.entries(
          highlightsByLine
        )) {
          const lineHighlightsByType: { [highlightType: string]: Highlight[] } =
            {};
          for (const highlight of lineSnippets) {
            if (
              lineHighlightsByType[highlight.highlighterTypeId] === undefined
            ) {
              lineHighlightsByType[highlight.highlighterTypeId] = [];
            }
            lineHighlightsByType[highlight.highlighterTypeId].push(highlight);
          }
          if (
            highlightTypeIds.every(
              (highlightTypeId) =>
                lineHighlightsByType[highlightTypeId]?.length === 1
            )
          ) {
            rv.push(
              highlightTypeIds.map(
                (highlightTypeId) => lineHighlightsByType[highlightTypeId][0]
              )
            );
          }
        }
        return rv.map((lineHighlights) => ({
          highlighterTypeId: schema.id,
          span: getSpanForMultipleSpans(lineHighlights.map((h) => h.span)),
          data: {},
          refs: Object.fromEntries(
            lineHighlights.map((lineHighlight) => [
              lineHighlight.highlighterTypeId,
              lineHighlight,
            ])
          ),
        }));
      };
    }
  }
  throw new Error();
}
