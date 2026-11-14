import { X } from "lucide-solid";
import { Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { useModalEscape } from "./useModalEscape";
import { Button } from "../../../shared/ui";

export function TableFormDialog(props: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  subtitle?: string;
  children: JSX.Element;
  footer: JSX.Element;
}) {
  useModalEscape(() => props.open, props.onClose);

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              props.onClose();
            }
          }}
        >
          <div
            class="table-edit-dialog table-form-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={props.titleId}
          >
            <header class="modal-header table-form-header">
              <div class="table-form-header-text">
                <h2 id={props.titleId} class="modal-title">
                  {props.title}
                </h2>
                <Show when={props.subtitle}>
                  <p class="table-form-subtitle">{props.subtitle}</p>
                </Show>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={props.onClose}
                aria-label="Close"
              >
                <X size={18} />
              </Button>
            </header>

            <div class="table-edit-body inspector-body-scroll table-form-body">
              {props.children}
            </div>

            <footer class="table-edit-footer">{props.footer}</footer>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
