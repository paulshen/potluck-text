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
        "relative px-2 py-1 text-sm font-mono rounded cursor-default whitespace-nowrap overflow-hidden text-ellipsis",
        isSelected ? "shadow-lg bg-zinc-900 text-white" : "bg-zinc-200"
      )}
    >
      {children}
    </div>
  );
}
