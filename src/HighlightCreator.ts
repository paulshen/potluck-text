import { Highlight } from "./primitives";

export enum HighlighterType {
  RegexHighlighter,
}

type HighlighterSchema = {
  id: string;
  postProcess?: (highlights: Highlight[], text: string) => Highlight[];
} & {
  type: HighlighterType.RegexHighlighter;
  regex: string;
};

export function createHighlighter(
  schema: HighlighterSchema
): (text: string, existingHighlights: Highlight[]) => Highlight[] {
  if (schema.type === HighlighterType.RegexHighlighter) {
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
  throw new Error();
}
