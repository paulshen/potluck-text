import { useDrag } from "@use-gesture/react";
import classNames from "classnames";
import { useRef, useState } from "react";
import { Position } from "./primitives";

let maxPaneZIndex = 1;

export function Pane({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<Position>([32, 32]);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
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
      className="w-[36rem] absolute top-0 left-0 rounded-lg"
      style={{
        boxShadow: `8px 8px 20px rgba(0, 0, 0, 0.15)`,
        top: `${position[1]}px`,
        left: `${position[0]}px`,
        zIndex: `${maxPaneZIndex}`,
      }}
      ref={rootRef}
      onMouseDown={() => {
        // hacky stuff here but move pane to top on mousedown
        rootRef.current!.style.zIndex = `${++maxPaneZIndex}`;
      }}
    >
      <div
        {...bindDrag()}
        className={classNames(
          "bg-white h-6 touch-none border-t-2 border-r-2 border-l-2 border-black rounded-t-lg flex flex-row justify-center items-center",
          isGrabbing ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          className="block"
        >
          <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
        </svg>
      </div>
      {children}
    </div>
  );
}
