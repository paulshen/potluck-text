import { useDrag } from "@use-gesture/react";
import classNames from "classnames";
import { useState } from "react";
import { Position } from "./primitives";

export function Pane({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<Position>([32, 32]);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const bindDrag = useDrag(
    ({ offset, first, last }) => {
      if (first) {
        setIsGrabbing(true);
      } else if (last) {
        setIsGrabbing(false);
      }
      setPosition(offset);
    },
    {
      from: () => position,
    }
  );

  return (
    <div
      className="w-[24rem] absolute top-0 left-0"
      style={{
        top: `${position[1]}px`,
        left: `${position[0]}px`,
      }}
    >
      <div
        {...bindDrag()}
        className={classNames(
          "h-4 bg-zinc-200 touch-none",
          isGrabbing ? "cursor-grabbing" : "cursor-grab"
        )}
      ></div>
      {children}
    </div>
  );
}
