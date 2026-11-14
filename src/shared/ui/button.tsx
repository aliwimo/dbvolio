import { splitProps, type JSX } from "solid-js";
import "./ui.css";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["variant", "size", "class", "type"]);
  return (
    <button
      type={local.type ?? "button"}
      class={`ui-btn ui-btn-${local.variant ?? "default"} ui-btn-${local.size ?? "default"} ${local.class ?? ""}`}
      {...rest}
    />
  );
}
