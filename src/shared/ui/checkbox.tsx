import { Check } from "lucide-solid";
import { splitProps, type JSX } from "solid-js";
import "./ui.css";

export type CheckboxProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export function Checkbox(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <span class={`ui-checkbox ${local.class ?? ""}`}>
      <input type="checkbox" {...rest} />
      <span class="ui-checkbox-box" aria-hidden="true">
        <Check size={12} stroke-width={3} />
      </span>
    </span>
  );
}
