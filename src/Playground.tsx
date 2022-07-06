import { useState } from "react";

const Token = ({ value }: { value: string }) => {
  const [open, setOpen] = useState(false);

  function toggleProperties() {
    console.log(open);
    setOpen(!open);
  }

  return (
    <div className="border-2 border-black inline-block px-2 rounded-l relative">
      <div>{value}</div>
      <div
        className="absolute border-2 border-black rounded-r text-white right-[-28px] p-1 top-[-2px]"
        onClick={toggleProperties}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
        >
          <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
        </svg>
      </div>

      {open && <div>Hello World</div>}
    </div>
  );
};

export const Playground = () => {
  return (
    <div className="p-12">
      <Token value="i am a token" />
    </div>
  );
};
