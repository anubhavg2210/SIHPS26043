import { Icon } from "./Icons";

export function Button({
  children,
  variant = "primary", // primary, secondary, outline, ghost, danger, success
  size = "md", // sm, md, lg
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = "left",
  type = "button",
  className = "",
  onClick,
  ...props
}) {
  const baseClasses = `cs-btn cs-btn-${variant} cs-btn-${size} ${className}`;

  return (
    <button
      type={type}
      className={baseClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <Icon name="spinner" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      ) : icon && iconPosition === "left" ? (
        <Icon name={icon} size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      ) : null}

      <span>{children}</span>

      {!loading && icon && iconPosition === "right" ? (
        <Icon name={icon} size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      ) : null}
    </button>
  );
}
