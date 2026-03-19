import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Input(props: InputProps) {
  return <input className="text-input" {...props} />;
}

export function TextArea(props: TextAreaProps) {
  return <textarea className="text-area" {...props} />;
}
