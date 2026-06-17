"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AdminChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: "chip" | "primary" | "ghost";
  children: ReactNode;
}

const VARIANT_CLASS = {
  chip: {
    base: "admin-choice-btn",
    active: "admin-choice-btn-active",
    inactive: "",
  },
  primary: {
    base: "admin-action-btn",
    active: "",
    inactive: "",
  },
  ghost: {
    base: "admin-ghost-btn",
    active: "admin-ghost-btn",
    inactive: "admin-ghost-btn",
  },
} as const;

export function AdminChoiceButton({
  active = false,
  variant = "chip",
  children,
  className = "",
  type = "button",
  ...props
}: AdminChoiceButtonProps) {
  const styles = VARIANT_CLASS[variant];
  const stateClass = variant === "chip" && active ? styles.active : styles.inactive;

  return (
    <button
      type={type}
      data-admin-interactive
      className={`${styles.base} ${stateClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
