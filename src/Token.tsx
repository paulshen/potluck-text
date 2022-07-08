import classNames from "classnames";

export function Token({
  isSelected = false,
  children,
  className,
  ...props
}: {
  isSelected?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={classNames(
        "relative px-2 py-1 font-sans rounded cursor-default whitespace-nowrap text-ellipsis",
        isSelected ? "shadow-lg bg-zinc-900 text-white" : "bg-zinc-200",
        className
      )}
    >
      {children}
    </div>
  );
}
