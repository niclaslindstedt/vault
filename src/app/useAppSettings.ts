// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's own (non-theme) settings. The framework deliberately leaves this
// in the app; it only owns the appearance projection. Persisted to
// localStorage so a reload keeps your choices. The storage *choice* lives
// here too — it is a small preference; the heavyweight state it points at
// (the folder handle, the Dropbox tokens) is persisted by `useStorage`.

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";

import type { StorageChoice } from "./types.ts";

export type AppSettings = {
  /** Where the vault is stored — see `backends.ts`. Default: this device. */
  storage: StorageChoice;
  /** OCR language handed to the engine (Tesseract traineddata id). */
  ocrLang: string;
  /** Developer mode: shows the Logs section in Settings. */
  devMode: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  storage: "device",
  ocrLang: "eng",
  devMode: false,
};

export function useAppSettings() {
  const [settings, setSettings] = useLocalStorageState<AppSettings>(
    "vault:settings",
    DEFAULT_SETTINGS,
  );
  return { settings, setSettings };
}
