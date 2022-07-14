import { createHighlighter, HighlighterSchemaType } from "../HighlightCreator";
import { HighlighterType } from "../primitives";

export const exeriseNameType: HighlighterType = {
  name: "Exercise name",
  icon: "",
  color: "#ffc107",
  highlight: createHighlighter({
    id: "exercise_name",
    type: HighlighterSchemaType.RegexHighlighter,
    regex: "\\b(bench|squat|plank|deadlift)\\b",
  }),

  parse: (text: string) => {},

  properties: [],
};
