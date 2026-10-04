import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps {
  label?: string;
  error?: string;
  children: ReactNode;
}

/** Label + contrôle + erreur. Le contrôle (input/select/textarea) doit utiliser la classe `fieldControl`. */
export default function Field({ label, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

export const fieldControl = styles.control;

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Raccourci pour le cas le plus courant : label + <input> simple. */
export function InputField({ label, error, className, ...rest }: InputFieldProps) {
  return (
    <Field label={label} error={error}>
      <input className={[styles.control, className].filter(Boolean).join(" ")} {...rest} />
    </Field>
  );
}
