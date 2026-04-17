import { translate } from "@vitalets/google-translate-api";
import { getTranslateConfigFromEnv } from "../config/translate";

export type TranslationResult = {
  sourceText: string;
  translatedText: string;
  detectedSourceLanguage?: string;
};

type TranslateRequest = {
  text: string;
};

export const TranslateService = {
  async translateSpanishToEnglish({ text }: TranslateRequest): Promise<TranslationResult> {
    const config = getTranslateConfigFromEnv();

    const response = await translate(text, {
      from: "es",
      to: "en",
      host: config.host,
      fetchOptions: {
        signal: AbortSignal.timeout(config.timeoutMs),
      },
    });

    return {
      sourceText: text,
      translatedText: response.text,
      detectedSourceLanguage: response.raw?.src,
    };
  },

  async translateManySpanishToEnglish(texts: string[]): Promise<TranslationResult[]> {
    return Promise.all(texts.map((text) => this.translateSpanishToEnglish({ text })));
  },
};
