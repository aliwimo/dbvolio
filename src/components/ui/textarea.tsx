import { splitProps, type JSX } from "solid-js";
import "./ui.css";

export type TextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return <textarea class={`ui-textarea ${local.class ?? ""}`} {...rest} />;
}
