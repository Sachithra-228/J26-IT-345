import { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-neutral-950", className)}>
      {children}
    </div>
  );
}
