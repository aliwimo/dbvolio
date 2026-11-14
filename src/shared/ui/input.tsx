import { splitProps, type JSX } from "solid-js";
import "./ui.css";

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return <input class={`ui-input ${local.class ?? ""}`} {...rest} />;
}
