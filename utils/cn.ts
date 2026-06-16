import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names with conditional logic.
 * Later classes override earlier ones following Tailwind specificity rules.
 *
 * @example
 * cn("p-4 text-sm", isActive && "bg-red-500", className)
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
