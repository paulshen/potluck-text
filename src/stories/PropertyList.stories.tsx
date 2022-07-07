import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { PropertyList } from "../PropertyList";

export default {
  title: "PropertyList",
  component: PropertyList,
} as ComponentMeta<typeof PropertyList>;

const Template: ComponentStory<typeof PropertyList> = (args) => (
  <PropertyList {...args} />
);

export const Default = Template.bind({});

const items = [
  { id: 1, name: "food", value: "Beef, Lean 70%  v", show: false },
  { id: 2, name: "aisle", value: "Produce", show: false },
  { id: 3, name: "CO2 Score", value: "5/5 Bad!", show: false },
  { id: 4, name: "vegan sub", value: "tofurkey", show: true },
];

Default.args = {
  title: "🥕 Ingredient",
  items,
};
