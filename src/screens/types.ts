import type { StatusMsg } from "../components/Footer";

export interface ScreenProps {
  /** values prefilled when reopening a calculation from history */
  seed?: Record<string, string>;
  onBack: () => void;
  setStatus: (s: StatusMsg | null) => void;
}
