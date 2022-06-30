import classNames from "classnames";

export function Token({
  isSelected = false,
  children,
}: {
  isSelected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={classNames(
        "relative px-2 py-1 text-xs font-mono rounded cursor-default whitespace-nowrap",
        isSelected ? "shadow-lg bg-zinc-300" : "bg-zinc-200"
      )}
    >
      {children}
    </div>
  );
}
