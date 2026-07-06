interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  confirmDanger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-content confirm-dialog">
        <h3 id="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} autoFocus>Cancelar</button>
          <button
            type="button"
            className={confirmDanger ? "btn-delete" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}