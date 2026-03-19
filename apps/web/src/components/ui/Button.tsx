import type { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx("btn", `btn-${variant}`, className)}
      {...props}
    />
  );
}
