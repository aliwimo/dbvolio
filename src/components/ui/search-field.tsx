import { Search } from "lucide-solid";
import { Show, type JSX } from "solid-js";
import { Input } from "./input";
import "./ui.css";

export function SearchField(props: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  class?: string;
  onInput: (value: string) => void;
  trailing?: JSX.Element;
}) {
  return (
    <div class={`search-field ${props.class ?? ""}`}>
      <Search size={12} class="search-field-icon" aria-hidden />
      <Input
        placeholder={props.placeholder}
        value={props.value}
        aria-label={props.ariaLabel}
        onInput={(e) => props.onInput(e.currentTarget.value)}
      />
      <Show when={props.trailing}>
        <div class="search-field-trailing">{props.trailing}</div>
      </Show>
    </div>
  );
}
