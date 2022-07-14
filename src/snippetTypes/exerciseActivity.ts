import { createHighlighter, HighlighterSchemaType } from "../HighlightCreator";
import { HighlighterType } from "../primitives";

export const exerciseActivityType: HighlighterType = {
  name: "Exercise activity",
  icon: "",
  color: "#ffc107",
  highlight: createHighlighter({
    id: "exercise_activity",
    type: HighlighterSchemaType.SameLineHighlighter,
    highlightTypeIds: ["exercise_name", "sets_and_reps"],
  }),

  parse: (text: string) => {},

  properties: [],
};
