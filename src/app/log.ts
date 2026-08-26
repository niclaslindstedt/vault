// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createLogStore } from "@niclaslindstedt/oss-framework/logging";

// A single in-app log buffer, built on the framework's logging module. The
// Logs settings tab renders it live through the framework's `LogViewer`; the
// storage backends, the OCR pipeline, and the encryption wrapper all write
// their diagnostics into it.
export const logStore = createLogStore({ logsKey: "vault:logs" });
logStore.setEnabled(true);
logStore.setCaptureEnabled(true);

export const log = logStore.createLogger("app");
