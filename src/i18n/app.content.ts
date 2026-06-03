import { defineIntlayerDictionary } from "./defineIntlayerDictionary";
import { messages, type Messages } from "./messages";

const appContent = defineIntlayerDictionary<Messages>("app", messages);

export default appContent;
