import React from "react";

export function Button({
  kind = "primary",
  size = "md",
  onClick,
  renderIcon: RenderIcon,
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`cds--btn cds--btn--${kind} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
      {RenderIcon && <RenderIcon size={16} />}
    </button>
  );
}

export default Button;
