import { useState } from "react";

/** Pequeno helper de campo de texto controlado. */
export function useField(initial = "") {
  const [value, set] = useState(initial);
  return { value, set };
}
