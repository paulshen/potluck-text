import { Reorder, useDragControls } from "framer-motion";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Snippet, SnippetPropertyAction } from "./primitives";

export interface PropertyListItem {
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
      className="bg-black rounded py-1 px-2 select-none"
    >
      <div className="flex items-center gap-2">
        <div onPointerDown={(e) => controls.start(e)} className="cursor-grab">
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block"
          >
            <rect x="3" y="3" width="5" height="1" fill="#575757" />
            <rect x="3" y="5" width="5" height="1" fill="#575757" />
            <rect x="3" y="7" width="5" height="1" fill="#575757" />
          </svg>
        </div>

        <div>
          <Checkbox.Root
            checked={item.show}
            onCheckedChange={() => togglePropertyVisible(item.id)}
            className="block"
          >
            <div className="border border-white rounded-[3px] h-[11px] w-[11px]">
              <Checkbox.Indicator className="block bg-white">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 9 9"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="block"
                >
                  <path
                    d="M1 5L3 7L8 2"
                    stroke="black"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Checkbox.Indicator>
            </div>
          </Checkbox.Root>
        </div>

        <div className="w-24 text-gray-400">{item.name}</div>

        <div>
          {item.value ?? <span className="text-gray-500">Unknown</span>}
        </div>

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
