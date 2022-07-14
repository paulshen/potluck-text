import { createHighlighter, HighlighterSchemaType } from "../HighlightCreator";
import { HighlighterType } from "../primitives";

export const setsAndRepsType: HighlighterType = {
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
