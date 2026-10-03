// Message d'erreur lisible depuis une réponse de l'API NestJS.
// `message` peut être une chaîne (erreur métier) ou un tableau de chaînes
// (erreurs de validation class-validator, ex: plusieurs champs invalides) —
// le mobile ne gère que le cas chaîne, on couvre les deux ici.

import { isAxiosError } from "axios";

export function getErrorMessage(err: unknown, fallback = "Une erreur est survenue."): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(" · ");
    if (typeof message === "string") return message;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
