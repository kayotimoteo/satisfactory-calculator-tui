import { Locales, type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
  internationalization: {
    locales: [Locales.PORTUGUESE_BRAZIL, Locales.ENGLISH_UNITED_STATES],
    defaultLocale: Locales.ENGLISH_UNITED_STATES,
  },
  content: {
    contentDir: ["src"],
  },
};

export default config;
