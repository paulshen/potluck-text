import { action, observable } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Highlight } from "./primitives";
// @ts-ignore
import rawIngredients from "./snippetTypes/ingredients.csv";
import { spanOverlaps } from "./utils";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, TrashIcon } from "@radix-ui/react-icons";

export enum HighlighterType {
  ListMatchHighlighter,
  RegexHighlighter,
  NextToHighlighter,
  CustomHighlighter,
}

export type HighlighterParser =
  | {
      type: HighlighterType.ListMatchHighlighter;
      list: string[];
    }
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
  | {
      type: HighlighterType.CustomHighlighter;
      parser: (text: string, existingHighlights: Highlight[]) => Highlight[];
    };

export type HighlighterConfig = {};

export type Highlighter = {
  id: string;
  name: string;
  icon: string;
  color: string;
  parser: HighlighterParser;
};

const BUILT_IN_HIGHLIGHTERS: Highlighter[] = [
  {
    id: "ingredient",
    name: "Ingredient",
    icon: "🥕",
    color: "hsla(212, 42%, 40%, 1)",
    parser: {
      type: HighlighterType.ListMatchHighlighter,
      list: rawIngredients.map((line: any) => line.name),
    },
  },
  {
    id: "quantity",
    name: "Quantity",
    icon: "⚖️",
    color: "hsl(349deg 80% 48%)",
    parser: {
      type: HighlighterType.RegexHighlighter,
      regex:
        "(\\d|\\/|¼|½|¾|⅛|\\.)+\\s?(g|gram|oz|tsp|Tbsp|pound|cup|cup|can|teaspoon|tablespoon)s?\\b",
    },
  },
];

export const highlightersMobx = observable.array<Highlighter>([
  BUILT_IN_HIGHLIGHTERS[0],
]);

export function parseWithHighlighter(
  highlighter: Highlighter,
  text: string,
  existingHighlights: Highlight[]
): Highlight[] {
  const { parser } = highlighter;
  switch (parser.type) {
    case HighlighterType.ListMatchHighlighter: {
      const matches: Highlight[] = [];
      // We could probably do this faster if we combined all the known strings into one regex,
      // but this is simpler to reason about and seems fast enough for now.
      for (const stringTemplate of parser.list) {
        for (const match of text.matchAll(
          new RegExp(`\\b${stringTemplate}\\b`, "ig")
        )) {
          const from = match.index ?? 0;
          const to = from + match[0].length;
          // Only add the match if it doesn't overlap with other existing matches.
          // This prevents weird overlapping matches
          if (
            matches.some((existing) => spanOverlaps(existing.span, [from, to]))
          ) {
            continue;
          }

          matches.push({
            span: [from, to],
            highlighterTypeId: highlighter.id,
            data: {},
            refs: {},
          });
        }
      }
      return matches;
    }
    case HighlighterType.RegexHighlighter: {
      const regex = new RegExp(parser.regex, "g");
      const matches: Highlight[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        const length = match[0].length;
        matches.push({
          highlighterTypeId: highlighter.id,
          span: [regex.lastIndex - length, regex.lastIndex],
          data: {},
          refs: {},
        });
      }
      return matches;
    }
    case HighlighterType.NextToHighlighter: {
      const {
        firstHighlightTypeId,
        secondHighlightTypeId,
        maxDistanceBetween,
      } = parser;
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
        highlighterTypeId: highlighter.id,
        span: [first.span[0], second.span[1]],
        data: {},
        refs: {
          [firstHighlightTypeId]: first,
          [secondHighlightTypeId]: second,
        },
      }));
    }
  }
  throw new Error();
}

const Highlighter = observer(
  ({ highlighter }: { highlighter: Highlighter }) => {
    return (
      <div className="border border-gray-200 px-2 py-1 rounded flex items-center justify-between">
        <div className="flex gap-2">
          <div style={{ color: highlighter.color }}>
            {highlighter.icon} {highlighter.name}
          </div>
        </div>
        <button
          onClick={action(() => {
            highlightersMobx.replace(
              highlightersMobx.filter((h) => h.id !== highlighter.id)
            );
          })}
          className="text-red-500"
        >
          <TrashIcon />
        </button>
      </div>
    );
  }
);

function HighlighterForm({
  highlighter,
}: {
  highlighter: Highlighter | undefined;
}) {
  const [id, setId] = useState(highlighter?.id ?? "");
  const [name, setName] = useState(highlighter?.name ?? "");
  return (
    <div>
      <div>{id}</div>
      <div>{name}</div>
    </div>
  );
}

const AddHighlighterDialogContent = observer(() => {
  const highlighterIds = highlightersMobx.map((h) => h.id);
  return (
    <Dialog.Description className="pt-4">
      {BUILT_IN_HIGHLIGHTERS.map((highlighter) => {
        return (
          <div className="mb-2" key={highlighter.id}>
            <button
              onClick={action(() => {
                highlightersMobx.push(highlighter);
              })}
              className="button"
              disabled={highlighterIds.includes(highlighter.id)}
            >
              {highlighter.name}
            </button>
          </div>
        );
      })}
    </Dialog.Description>
  );
});

function AddHighlighterButton() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild={true}>
        <button className="button">Add Highlighter</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-80" />
        <Dialog.Content className="w-[90vw] max-w-lg p-8 bg-white fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg">
          <Dialog.Title>Add Highlighter</Dialog.Title>
          <AddHighlighterDialogContent />
          <Dialog.Close asChild={true}>
            <button className="flex p-1 absolute top-4 right-4">
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const HighlightManager = observer(() => {
  return (
    <div>
      <div className="flex flex-col gap-2 w-64 mb-4">
        {highlightersMobx.map((highlighter) => (
          <Highlighter highlighter={highlighter} key={highlighter.id} />
        ))}
      </div>
      <AddHighlighterButton />
    </div>
  );
});
