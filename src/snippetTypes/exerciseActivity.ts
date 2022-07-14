import { createHighlighter, HighlighterType } from "../HighlightCreator";
import { SnippetType } from "../primitives";

export const exerciseActivityType: SnippetType = {
  name: "Exercise activity",
  icon: "",
  color: "#ffc107",
  highlight: createHighlighter({
    id: "exercise_activity",
    type: HighlighterType.SameLineHighlighter,
    highlightTypeIds: ["exercise_name", "sets_and_reps"],
  }),

  parse: (text: string) => {},

  properties: [],
};
