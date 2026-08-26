// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's i18n runtime, built once from the framework's `createI18n`
// factory over the app's own catalogs. English is the only bundled language
// for now; adding one is a code-split loader entry here plus a sibling
// catalog file (see the contacts reference app's `sv.ts`).

import { createI18n } from "@niclaslindstedt/oss-framework/i18n";

import { en, type Catalog } from "./en.ts";

export type Lang = "en";
export type { Catalog };

export const i18n = createI18n<Lang, Catalog>({
  fallbackLang: "en",
  fallbackCatalog: en,
  loaders: {},
  toBcp47: () => "en-GB",
  storageKey: "vault:language",
  eventName: "vault:language",
});

export const { LanguageRoot, useT, useLang, setLanguage, supportedLangs } =
  i18n;

/** The translate function `useT()` returns. */
export type TFn = ReturnType<typeof useT>;
