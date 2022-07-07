import { Reorder, useDragControls } from "framer-motion";
import * as Checkbox from "@radix-ui/react-checkbox";
import { useState } from "react";
import { Snippet, SnippetPropertyAction } from "./primitives";

interface PropertyListItem {
  id: string;
  name: string;
  value: string;
  actions: SnippetPropertyAction[];
  show: boolean;
}

interface PropertyListItemProps {
  item: PropertyListItem;
  togglePropertyVisible: (propertyId: string) => void;
  snippet: Snippet;
}

const PropertyListItem = ({
  item,
  togglePropertyVisible,
  snippet,
}: PropertyListItemProps) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      dragControls={controls}
      dragListener={false}
      value={item}
      className="bg-black rounded p-2"
    >
      <div className="flex gap-2">
        <div onPointerDown={(e) => controls.start(e)} className="cursor-grab">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            className="block"
          >
            <path
              className="fill-white"
              fillRule="evenodd"
              d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 110 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 110 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 100 1.5h12.5a.75.75 0 100-1.5H1.75z"
            ></path>
          </svg>
        </div>

        <div>
          <Checkbox.Root
            checked={item.show}
            onCheckedChange={() => togglePropertyVisible(item.id)}
          >
            <div className="bg-white rounded h-[16px] w-[16px]">
              <Checkbox.Indicator>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <path
                    fillRule="evenodd"
                    d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
                  ></path>
                </svg>
              </Checkbox.Indicator>
            </div>
          </Checkbox.Root>
        </div>

        <div className="w-24 text-gray-400">{item.name}</div>

        <div>{item.value}</div>

        <div className="flex gap-1 items-start">
          {item.actions.map((action, i) => {
            if (!action.available(snippet)) {
              return null;
            }
            return (
              <button
                onClick={() => {
                  action.handler(snippet);
                }}
                className="bg-white bg-opacity-25 px-1 rounded"
                key={i}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </Reorder.Item>
  );
};

interface PropertyListProps {
  snippet: Snippet;
  title: string;
  items: PropertyListItem[];
  togglePropertyVisible: (id: string) => void;
  reorderItems: (ids: string[]) => void;
}

export const PropertyList = ({
  snippet,
  title,
  items,
  togglePropertyVisible,
  reorderItems,
}: PropertyListProps) => {
  return (
    <div className="bg-black text-white w-[300px] text-xs rounded">
      <div className="p-2">{title}</div>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(items) => reorderItems(items.map((i) => i.id))}
      >
        {items.map((item, i) => (
          <PropertyListItem
            key={item.id}
            item={item}
            togglePropertyVisible={togglePropertyVisible}
            snippet={snippet}
          />
        ))}
      </Reorder.Group>
    </div>
  );
};
