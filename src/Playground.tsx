import { PropertyList } from "./PropertyList";

const initialItems = [
  { id: 1, name: "food name", value: "Beef, Lean 70%  v", show: false },
  { id: 2, name: "aisle", value: "Produce", show: false },
  { id: 3, name: "climate change", value: "5/5 Bad!", show: false },
  { id: 4, name: "vegan substitute", value: "tofurkey", show: true },
];

export const Playground = () => {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <PropertyList items={initialItems} />
    </div>
  );
};
