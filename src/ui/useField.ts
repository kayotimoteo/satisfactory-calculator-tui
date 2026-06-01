import { useState } from "react";

/** Small controlled text-field helper. */
export function useField(initial = "") {
  const [value, set] = useState(initial);
  return { value, set };
}
