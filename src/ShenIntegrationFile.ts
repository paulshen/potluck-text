import { runInAction } from "mobx";
import {
  FIRST_TEXT_ID,
  snippetEditorAnnotationsMobx,
  snippetsMobx,
  spatialComponentsMobx,
} from "./primitives";

// temporary file with integration examples

window.populateExampleSnippets = () => {
  runInAction(() => {
    spatialComponentsMobx.replace([]);
    snippetsMobx.replace({
      "1": {
        id: "1",
        snippetTypeId: "",
        textId: FIRST_TEXT_ID,
        span: [41, 58],
        data: {},
      },
      "2": {
        id: "2",
        snippetTypeId: "",
        textId: FIRST_TEXT_ID,
        span: [103, 115],
        data: {},
      },
      "3": {
        id: "3",
        snippetTypeId: "",
        textId: FIRST_TEXT_ID,
        span: [123, 127],
        data: {},
      },
      "4": {
        id: "4",
        snippetTypeId: "",
        textId: FIRST_TEXT_ID,
        span: [141, 154],
        data: {},
      },
    });
    // This might be computed data but this is an explicit API to control the
    // editor. It should contain a mapping of snippetId => {key, value}[]
    snippetEditorAnnotationsMobx.replace({
      "1": [
        { key: "Aisle", value: "meat" },
        { key: "Substitution", value: "tofurkey" },
      ],
      "2": [{ key: "Aisle", value: "spice" }],
      "3": [{ key: "Aisle", value: "spice" }],
      "4": [{ key: "Aisle", value: "spice" }],
    });
  });
};
