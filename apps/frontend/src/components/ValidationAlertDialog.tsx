import { useEffect, useMemo } from "react";

type ValidationAlert = {
  rule_code: string;
  severity: string;
  message: string;
  is_blocking: boolean;
};

const RULE_LABELS: Record<string, string> = {
  INVALID_TIME_RANGE: "Horario inválido",
  INSTRUCTOR_INACTIVE: "Instructor inactivo",
  GROUP_INACTIVE: "Ficha inactiva",
  ENVIRONMENT_INACTIVE: "Ambiente inactivo",
  LEARNING_RESULT_NOT_IN_PROGRAM: "RAP no asociado al programa",
  ENVIRONMENT_CAPACITY_LOW: "Capacidad insuficiente del ambiente",
  INSTRUCTOR_OVERLAP: "Cruce de horario del instructor",
  GROUP_OVERLAP: "Cruce de horario de la ficha",
  GROUP_RAP_DUPLICATED: "RAP duplicado en la ficha",
  ENVIRONMENT_OVERLAP: "Cruce de horario del ambiente",
  PLANT_INSTRUCTOR_MAX_HOURS: "Máximo de horas del instructor de planta",
  PLANT_INSTRUCTOR_EXTRA_HOURS: "Horas adicionales del instructor de planta",
  CONTRACTOR_MISSING_HOURS: "Horas pendientes del instructor contratista",
  CONTRACTOR_OVER_40_HOURS: "Carga superior a 40 horas del contratista",
};

export function validationRuleLabel(code: string): string {
  return RULE_LABELS[code] || code.replaceAll("_", " ").toLocaleLowerCase("es");
}

interface ValidationAlertDialogProps {
  open: boolean;
  validations: ValidationAlert[];
  onClose: () => void;
}

export function ValidationAlertDialog({ open, validations, onClose }: ValidationAlertDialogProps) {
  const alerts = useMemo(
    () => Array.from(
      new Map(
        validations
          .filter((item) => item.is_blocking || item.severity === "BLOCKING")
          .map((item) => [`${item.rule_code}:${item.message}`, item])
      ).values()
    ),
    [validations]
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || alerts.length === 0) return null;

  return (
    <div className="modal-overlay validation-alert-overlay" role="alertdialog" aria-modal="true" aria-labelledby="validation-alert-title">
      <div className="validation-alert-dialog">
        <div className="validation-alert-icon" aria-hidden="true">!</div>
        <div className="validation-alert-content">
          <p className="eyebrow">Alerta bloqueante</p>
          <h2 id="validation-alert-title">No se puede guardar la programación</h2>
          <p>Corrige estas situaciones antes de volver a intentarlo:</p>
          <ul>
            {alerts.map((alert) => (
              <li key={`${alert.rule_code}:${alert.message}`}>
                <strong>{validationRuleLabel(alert.rule_code)}</strong>
                <span>{alert.message}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-delete" onClick={onClose} autoFocus>Entendido</button>
        </div>
      </div>
    </div>
  );
}
