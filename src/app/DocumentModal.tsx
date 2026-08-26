// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The document editor — a framework `Modal` over one document: title,
// category, folder, tags, note, the attached file, and the searchable
// sidecar. "Extract text (OCR)" runs the on-device engine (`ocr.ts`) over an
// attached image and writes the result into the sidecar; the text is
// editable afterwards, because OCR misreads and the sidecar is the search
// index.

import { useEffect, useRef, useState } from "react";

import { Button, Modal } from "@niclaslindstedt/oss-framework/components";

import { normalizeFolder } from "./categories.ts";
import { useT } from "./i18n/index.ts";
import { canOcr } from "./sidecar.ts";
import { ocrEngine, type OcrProgress } from "./ocr.ts";
import { withTagAdded, withTagRemoved, allTags } from "./tags.ts";
import type { VaultData, VaultDocument } from "./types.ts";
import type { VaultStore } from "./useVaultStore.ts";

type Props = {
  open: boolean;
  onClose: () => void;
  data: VaultData;
  store: VaultStore;
  docId: string | null;
  ocrLang: string;
};

export function DocumentModal({
  open,
  onClose,
  data,
  store,
  docId,
  ocrLang,
}: Props) {
  const t = useT();
  const doc: VaultDocument | undefined = data.documents.find(
    (d) => d.id === docId,
  );
  const [tagDraft, setTagDraft] = useState("");
  const [ocrBusy, setOcrBusy] = useState<OcrProgress | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Reset transient edit state when the modal switches documents.
  useEffect(() => {
    setTagDraft("");
    setOcrBusy(null);
  }, [docId, open]);

  if (!doc) return null;

  const patch = (p: Partial<Omit<VaultDocument, "id" | "createdAt">>) =>
    store.updateDocument(doc.id, p);

  const commitTag = () => {
    const next = withTagAdded(doc.tags, tagDraft);
    if (next !== doc.tags) patch({ tags: next });
    setTagDraft("");
  };

  const attach = async (file: File) => {
    await store.attachFile(doc.id, file, { name: file.name, mime: file.type });
  };

  const runOcr = async () => {
    if (!doc.file || !canOcr(doc.file.mime)) return;
    const blob = await store.readFile(doc.file);
    if (!blob) return;
    setOcrBusy({ progress: 0, stage: "starting" });
    try {
      const engine = ocrEngine();
      const text = await engine.recognize(blob, {
        lang: ocrLang,
        onProgress: setOcrBusy,
      });
      store.setSidecar(doc.id, text, "ocr", {
        engine: engine.id,
        lang: ocrLang,
      });
    } finally {
      setOcrBusy(null);
    }
  };

  const remove = () => {
    if (window.confirm(t("doc.deleteConfirm"))) {
      store.removeDocument(doc.id);
      onClose();
    }
  };

  const suggestions = allTags(data.documents).filter(
    (x) => !doc.tags.some((y) => y.toLowerCase() === x.toLowerCase()),
  );

  return (
    <Modal open={open} onClose={onClose} labelledBy="doc-modal-title">
      <div className="flex flex-col gap-3 p-4">
        <h2
          id="doc-modal-title"
          className="text-base font-semibold text-fg-bright"
        >
          {t("doc.editTitle")}
        </h2>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{t("doc.titleLabel")}</span>
          <input
            value={doc.title}
            onInput={(e) =>
              patch({ title: (e.target as HTMLInputElement).value })
            }
            placeholder={t("doc.titlePlaceholder")}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-fg focus:border-accent focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t("doc.categoryLabel")}</span>
            <select
              value={doc.category}
              onChange={(e) =>
                patch({ category: (e.target as HTMLSelectElement).value })
              }
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-fg focus:border-accent focus:outline-none"
            >
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t("doc.folderLabel")}</span>
            <input
              value={doc.folder}
              onInput={(e) =>
                patch({
                  folder: normalizeFolder((e.target as HTMLInputElement).value),
                })
              }
              placeholder={t("doc.folderPlaceholder")}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-fg focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{t("doc.tagsLabel")}</span>
          <div className="flex flex-wrap items-center gap-1">
            {doc.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => patch({ tags: withTagRemoved(doc.tags, tag) })}
                className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-xs text-fg hover:border-danger hover:text-danger"
                title={t("common.delete")}
              >
                #{tag} ×
              </button>
            ))}
            <input
              value={tagDraft}
              onInput={(e) => setTagDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTag();
                }
              }}
              onBlur={commitTag}
              placeholder={t("doc.tagPlaceholder")}
              list="vault-tag-suggestions"
              className="min-w-24 flex-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-fg focus:border-accent focus:outline-none"
            />
            <datalist id="vault-tag-suggestions">
              {suggestions.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{t("doc.noteLabel")}</span>
          <textarea
            value={doc.note}
            onInput={(e) =>
              patch({ note: (e.target as HTMLTextAreaElement).value })
            }
            placeholder={t("doc.notePlaceholder")}
            rows={3}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-fg focus:border-accent focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{t("doc.fileLabel")}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              {doc.file ? t("doc.replaceFile") : t("doc.attachFile")}
            </Button>
            {doc.file && (
              <span className="min-w-0 truncate text-xs text-muted">
                {doc.file.name} · {Math.round(doc.file.size / 1024)} kB
              </span>
            )}
            <input
              ref={fileInput}
              type="file"
              hidden
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) void attach(f);
              }}
            />
          </div>
        </div>

        {doc.file && canOcr(doc.file.mime) && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void runOcr()}
              disabled={!!ocrBusy}
            >
              {ocrBusy
                ? `${t("doc.ocrRunning")} ${Math.round(ocrBusy.progress * 100)}%`
                : t("doc.runOcr")}
            </Button>
          </div>
        )}

        {(doc.sidecar || doc.file) && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t("doc.sidecarLabel")}</span>
            <textarea
              value={doc.sidecar?.text ?? ""}
              onInput={(e) =>
                store.setSidecar(
                  doc.id,
                  (e.target as HTMLTextAreaElement).value,
                  "manual",
                )
              }
              rows={5}
              className="rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs text-fg focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-muted">{t("doc.sidecarHint")}</span>
          </label>
        )}

        <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
          <Button
            variant="ghost"
            onClick={() => patch({ favorite: !doc.favorite })}
          >
            {doc.favorite ? "★" : "☆"} {t("doc.favorite")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => patch({ archived: !doc.archived })}
          >
            {doc.archived ? t("doc.unarchive") : t("doc.archive")}
          </Button>
          <span className="flex-1" />
          <Button variant="danger" onClick={remove}>
            {t("common.delete")}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
