import { splitProps, type JSX } from "solid-js";
import "./ui.css";

export type LabelProps = JSX.LabelHTMLAttributes<HTMLLabelElement>;

export function Label(props: LabelProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return <label class={`ui-label ${local.class ?? ""}`} {...rest} />;
}
