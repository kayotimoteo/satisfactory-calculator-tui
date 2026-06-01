import { copyText } from "./clipboard";
import type { StatusMsg } from "../components/Footer";

/** Copies text to the OS clipboard and returns a footer status message. */
export function copyWithStatus(
  text: string,
  okMsg: (text: string) => string,
  failMsg: string,
): StatusMsg {
  const ok = copyText(text);
  return ok ? { text: okMsg(text), tone: "ok" } : { text: failMsg, tone: "err" };
}
