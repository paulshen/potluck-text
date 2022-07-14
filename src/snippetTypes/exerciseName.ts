import { createHighlighter, HighlighterType } from "../HighlightCreator";
import { SnippetType } from "../primitives";

export const exeriseNameType: SnippetType = {
  name: "Exercise name",
  icon: "",
  color: "#ffc107",
  highlight: createHighlighter({
    id: "exercise_name",
    type: HighlighterType.RegexHighlighter,
    regex: "\\b(bench|squat|plank|deadlift)\\b",
  }),

  parse: (text: string) => {},

  properties: [],
};