import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string | number;
  label: string;
  description?: string;
};

type SearchableSelectProps = {
  label?: string;
  name?: string;
  value: string | number | "";
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxVisibleOptions?: number;
  onChange: (value: string | number | "") => void;
};

export function SearchableSelect({
  label,
  name,
  value,
  options,
  placeholder = "Seleccione una opción...",
  searchPlaceholder = "Buscar...",
  required = false,
  disabled = false,
  maxVisibleOptions = 50,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const selectedOption = options.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return options
      .filter((option) => !term || `${option.label} ${option.description ?? ""}`.toLocaleLowerCase("es").includes(term))
      .slice(0, maxVisibleOptions);
  }, [options, search, maxVisibleOptions]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const close = () => { setOpen(false); setSearch(""); };

  return (
    <div className="searchable-select" ref={rootRef} onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      {label && <span className="searchable-select-label">{label} {required && <span className="req">*</span>}</span>}
      {name && <input type="hidden" name={name} value={value} />}
      {required && <input className="visually-hidden" tabIndex={-1} aria-hidden="true" value={value} required onChange={() => {}} />}
      <button
        type="button"
        className="searchable-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption?.label || placeholder}</span><span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="searchable-select-panel" id={panelId}>
          <input className="searchable-select-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} autoFocus />
          {!required && value !== "" && <button type="button" className="searchable-select-clear" onClick={() => { onChange(""); close(); }}>Limpiar selección</button>}
          <div className="searchable-select-options" role="listbox">
            {filteredOptions.length === 0 ? <div className="searchable-select-empty">No se encontraron resultados.</div> : filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={String(option.value) === String(value)}
                className={`searchable-select-option ${String(option.value) === String(value) ? "selected" : ""}`}
                onClick={() => { onChange(option.value); close(); }}
              >
                <strong>{option.label}</strong>{option.description && <span>{option.description}</span>}
              </button>
            ))}
          </div>
          {options.length > maxVisibleOptions && !search.trim() && <div className="searchable-select-hint">Escriba para buscar entre todos los registros.</div>}
        </div>
      )}
    </div>
  );
}
