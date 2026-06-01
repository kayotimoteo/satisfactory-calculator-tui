import type { StatusMsg } from "../components/Footer";

export interface ScreenProps {
  /** valores pré-preenchidos ao reabrir um cálculo do histórico */
  seed?: Record<string, string>;
  onBack: () => void;
  setStatus: (s: StatusMsg | null) => void;
}
