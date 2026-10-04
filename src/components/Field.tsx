import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}

/** Label + contrôle + erreur. Le contrôle (input/select/textarea) doit utiliser la classe `fieldControl`. */
export default function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
      )}
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

/** Raccourci pour le cas le plus courant : label + <input> simple, label lié par `id` (accessibilité). */
export function InputField({ label, error, className, id, ...rest }: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} htmlFor={inputId} error={error}>
      <input id={inputId} className={[styles.control, className].filter(Boolean).join(" ")} {...rest} />
    </Field>
  );
}
