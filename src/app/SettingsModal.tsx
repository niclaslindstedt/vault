// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Settings — storage backend first (that is the app's one real policy
// surface), then the developer log viewer. The storage section enforces the
// app's rules in its UI shape: the device backend is the default and always
// present; the local folder appears only where the File System Access API
// exists (desktop); Dropbox appears only when a build-time app key is set,
// and connecting it REQUIRES a passphrase — the section offers no way to
// store plaintext in the cloud, mirroring `backends.ts` where that path
// isn't constructible.

import { useState, type ReactNode } from "react";

import { Button, Modal } from "@niclaslindstedt/oss-framework/components";
import { LogViewer } from "@niclaslindstedt/oss-framework/logging";

import { availableBackends } from "./backends.ts";
import { useT } from "./i18n/index.ts";
import { logStore } from "./log.ts";
import type { StorageChoice } from "./types.ts";
import type { AppSettings } from "./useAppSettings.ts";
import type { StorageState } from "./useStorage.ts";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  storage: StorageState;
};

export function SettingsModal({
  open,
  onClose,
  settings,
  setSettings,
  storage,
}: Props) {
  const t = useT();
  const [passphrase, setPassphrase] = useState("");
  const backends = availableBackends();

  const choose = (choice: StorageChoice) =>
    setSettings({ ...settings, storage: choice });

  const backendRow = (
    choice: StorageChoice,
    label: string,
    hint: string,
    action?: ReactNode,
  ) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3">
      <input
        type="radio"
        name="storage"
        checked={settings.storage === choice}
        onChange={() => choose(choice)}
        className="mt-1"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-fg-bright">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
        {action}
      </span>
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} labelledBy="settings-modal-title">
      <div className="flex flex-col gap-4 p-4">
        <h2
          id="settings-modal-title"
          className="text-base font-semibold text-fg-bright"
        >
          {t("settings.title")}
        </h2>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("settings.storageHeading")}
          </h3>

          {backendRow("device", t("settings.device"), t("settings.deviceHint"))}

          {backends.includes("folder") &&
            backendRow(
              "folder",
              t("settings.folder"),
              t("settings.folderHint"),
              settings.storage === "folder" ? (
                <span className="flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    onClick={() => void storage.connectFolder()}
                  >
                    {t("settings.folderChoose")}
                  </Button>
                  {storage.folderConnected && (
                    <Button
                      variant="ghost"
                      onClick={() => void storage.disconnectFolder()}
                    >
                      {t("settings.disconnect")}
                    </Button>
                  )}
                </span>
              ) : undefined,
            )}

          {backends.includes("dropbox") &&
            backendRow(
              "dropbox",
              t("settings.dropbox"),
              t("settings.dropboxHint"),
              settings.storage === "dropbox" ? (
                <span className="flex flex-col gap-2 pt-1">
                  <span className="flex flex-col gap-1">
                    <span className="text-xs text-muted">
                      {t("settings.passphraseLabel")}
                    </span>
                    <input
                      type="password"
                      value={passphrase}
                      onInput={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        setPassphrase(v);
                        storage.setPassphrase(v);
                      }}
                      placeholder={t("settings.passphrasePlaceholder")}
                      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
                    />
                    <span className="text-xs text-muted">
                      {t("settings.passphraseHint")}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {storage.dropboxConnected ? (
                      <Button
                        variant="ghost"
                        onClick={storage.disconnectDropbox}
                      >
                        {t("settings.disconnect")}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled={!storage.unlocked}
                        onClick={() => void storage.connectDropbox()}
                      >
                        {t("settings.dropboxConnect")}
                      </Button>
                    )}
                  </span>
                </span>
              ) : undefined,
            )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("settings.logsHeading")}
          </h3>
          <div className="max-h-64 overflow-y-auto rounded-md border border-line">
            <LogViewer store={logStore} />
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("settings.aboutHeading")}
          </h3>
          <p className="text-xs text-muted">
            Vault {__BUILD_LABEL__} · {__BUILD_COMMIT__} · build{" "}
            {__BUILD_NUMBER__}
          </p>
        </section>

        <div className="flex justify-end border-t border-line pt-3">
          <Button variant="primary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
