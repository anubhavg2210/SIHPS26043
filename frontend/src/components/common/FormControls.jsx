import { useId } from "react";

export function Input({
  label,
  id,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  error = "",
  hint = "",
  disabled = false,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;

  return (
    <div className={`cs-form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="cs-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`cs-input ${error ? "border-danger" : ""}`}
        {...props}
      />
      {hint && !error && <div className="cs-form-hint">{hint}</div>}
      {error && <div className="cs-form-error">{error}</div>}
    </div>
  );
}

export function Textarea({
  label,
  id,
  name,
  value,
  onChange,
  placeholder = "",
  rows = 4,
  required = false,
  error = "",
  hint = "",
  disabled = false,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;

  return (
    <div className={`cs-form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="cs-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        name={name}
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`cs-textarea ${error ? "border-danger" : ""}`}
        {...props}
      />
      {hint && !error && <div className="cs-form-hint">{hint}</div>}
      {error && <div className="cs-form-error">{error}</div>}
    </div>
  );
}

export function Select({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Select an option...",
  required = false,
  error = "",
  hint = "",
  disabled = false,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;

  return (
    <div className={`cs-form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="cs-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={inputId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`cs-select ${error ? "border-danger" : ""}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {hint && !error && <div className="cs-form-hint">{hint}</div>}
      {error && <div className="cs-form-error">{error}</div>}
    </div>
  );
}
