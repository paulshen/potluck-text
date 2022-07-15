import { action, computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import {
  BUILT_IN_HIGHLIGHTERS,
  hiddenHighlighterIdsMobx,
  Highlight,
  Highlighter,
  HighlighterParserType,
  highlightersMobx,
} from "./primitives";
import { spanOverlaps } from "./utils";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckIcon,
  Cross2Icon,
  EyeNoneIcon,
  EyeOpenIcon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useFormik } from "formik";

export function parseWithHighlighter(
  highlighter: Highlighter,
  text: string,
  existingHighlights: Highlight[]
): Highlight[] {
  const { parser } = highlighter;
  switch (parser.type) {
    case HighlighterParserType.ListMatchHighlighter: {
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
    case HighlighterParserType.RegexHighlighter: {
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
    case HighlighterParserType.NextToHighlighter: {
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

function EditHighlighterDialogContent({
  highlighter,
  onClose,
}: {
  highlighter: Highlighter;
  onClose: () => void;
}) {
  const formik = useFormik({
    initialValues: {
      name: highlighter.name,
      icon: highlighter.icon,
    },
    onSubmit: (values) => {
      runInAction(() => {
        highlighter.name = values.name;
        highlighter.icon = values.icon;
      });
      onClose();
    },
  });
  return (
    <div className="pt-4">
      <form onSubmit={formik.handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center">
          <label className="w-32">id</label>
          <div className="grow">{highlighter.id}</div>
        </div>
        <div className="flex items-center">
          <label htmlFor="name" className="w-32">
            name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            onChange={formik.handleChange}
            value={formik.values.name}
            className="border border-gray-200 p-1 rounded-sm grow"
          />
        </div>
        <div className="flex items-center">
          <label htmlFor="name" className="w-32">
            icon
          </label>
          <input
            id="icon"
            name="icon"
            type="text"
            onChange={formik.handleChange}
            value={formik.values.icon}
            className="border border-gray-200 p-1 rounded-sm grow"
          />
        </div>
        <div className="mt-4">
          <button type="submit" className="button">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

function HighlighterEditButton({ highlighter }: { highlighter: Highlighter }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={(open) => setOpen(open)}>
      <Dialog.Trigger asChild={true}>
        <button className="text-gray-500">
          <Pencil1Icon />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-80" />
        <Dialog.Content className="w-[90vw] max-w-lg p-8 bg-white fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg">
          <Dialog.Title>Edit Highlighter</Dialog.Title>
          <EditHighlighterDialogContent
            highlighter={highlighter}
            onClose={() => {
              setOpen(false);
            }}
          />
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

const HighlighterComponent = observer(
  ({ highlighter }: { highlighter: Highlighter }) => {
    const isHidden = computed(() =>
      hiddenHighlighterIdsMobx.has(highlighter.id)
    ).get();
    return (
      <div className="border border-gray-200 px-2 py-1 rounded flex items-center">
        <div className="flex gap-2">
          <div className="text-yellow-600">
            {highlighter.icon} {highlighter.name}
          </div>
        </div>
        <div className="grow" />
        <div className="flex gap-2">
          <button
            onClick={action(() => {
              if (isHidden) {
                hiddenHighlighterIdsMobx.delete(highlighter.id);
              } else {
                hiddenHighlighterIdsMobx.add(highlighter.id);
              }
            })}
            className="text-gray-500"
          >
            {isHidden ? <EyeNoneIcon /> : <EyeOpenIcon />}
          </button>
          <HighlighterEditButton highlighter={highlighter} />
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
      </div>
    );
  }
);

const AddHighlighterDialogContent = observer(() => {
  const highlighterIds = highlightersMobx.map((h) => h.id);
  return (
    <div className="pt-4">
      {BUILT_IN_HIGHLIGHTERS.map((highlighter) => {
        const isAlreadyEnabled = highlighterIds.includes(highlighter.id);
        return (
          <div className="mb-2" key={highlighter.id}>
            <button
              onClick={action(() => {
                highlightersMobx.push(highlighter);
              })}
              className="button flex items-center gap-1"
              disabled={isAlreadyEnabled}
            >
              {highlighter.name}
              {isAlreadyEnabled ? <CheckIcon /> : null}
            </button>
          </div>
        );
      })}
    </div>
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
    <div className="bg-white">
      <div className="flex flex-col gap-2 w-64 mb-4">
        {highlightersMobx.map((highlighter) => (
          <HighlighterComponent
            highlighter={highlighter}
            key={highlighter.id}
          />
        ))}
      </div>
      <AddHighlighterButton />
    </div>
  );
});
