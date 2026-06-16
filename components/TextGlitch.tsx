"use client";

interface TextGlitchProps {
  text: string;
  className?: string;
}

export function TextGlitch({ text, className }: TextGlitchProps) {
  return <span className={className ? `text-glitch ${className}` : "text-glitch"}>{text}</span>;
}
