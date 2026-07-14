type DetailField = {
  label: string;
  value: unknown;
};

interface DetailDialogProps {
  open: boolean;
  title: string;
  fields: DetailField[];
  onClose: () => void;
}

export function DetailDialog({ open, title, fields, onClose }: DetailDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-dialog-title" onMouseDown={onClose}>
      <div className="modal-content detail-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div>
            <p className="eyebrow">Detalle del registro</p>
            <h3 id="detail-dialog-title">{title}</h3>
          </div>
          <button type="button" className="detail-dialog-close" onClick={onClose} aria-label="Cerrar detalle">×</button>
        </div>
        <dl className="detail-grid">
          {fields.map(({ label, value }) => (
            <div key={label} className="detail-field">
              <dt>{label}</dt>
              <dd>{value === null || value === undefined || value === "" ? "—" : String(value)}</dd>
            </div>
          ))}
        </dl>
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
