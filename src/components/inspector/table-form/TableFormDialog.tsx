import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useModalEscape } from "./useModalEscape";

export function TableFormDialog({
  open,
  onClose,
  titleId,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  useModalEscape(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="table-edit-dialog table-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header table-form-header">
          <div className="table-form-header-text">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {subtitle && <p className="table-form-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="table-edit-body inspector-body-scroll table-form-body">
          {children}
        </div>

        <footer className="table-edit-footer">{footer}</footer>
      </div>
    </div>
  );
}
