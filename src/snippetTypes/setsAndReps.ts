import { createHighlighter, HighlighterSchemaType } from "../HighlightCreator";
import { SnippetType } from "../primitives";

export const setsAndRepsType: SnippetType = {
  name: "Sets x Reps",
  icon: "",
  color: "#ffc107",
  highlight: createHighlighter({
    id: "sets_and_reps",
    type: HighlighterSchemaType.RegexHighlighter,
    regex: "\\b(?<sets>\\d+)x(?<reps>\\d+)\\b",
  }),

  parse: (text: string) => {},

  properties: [],
};
