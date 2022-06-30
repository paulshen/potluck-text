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
        isSelected ? "shadow-lg bg-opacity-100" : "bg-opacity-80",
        "bg-zinc-300"
      )}
    >
      {children}
    </div>
  );
}