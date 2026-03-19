import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

type CardProps = PropsWithChildren<{ className?: string }>;

export function Card({ className, children }: CardProps) {
  return <section className={clsx("card", className)}>{children}</section>;
}
