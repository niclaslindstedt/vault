// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The main screen: the filtered document list for the active view (all /
// category+folder / tag / archive), with an inline search field that ranks
// hits across titles, notes, tags — and *inside* documents, via their OCR /
// extracted sidecars (`search.ts`). Rows open the editor modal.

import { useMemo, useState } from "react";

import { Button } from "@niclaslindstedt/oss-framework/components";
import { Glyph } from "@niclaslindstedt/oss-framework/glyphs";

import { foldersInCategory } from "./categories.ts";
import { filterDocuments, sortForList } from "./documents.ts";
import { VAULT_GLYPH_PATHS } from "./glyphs.ts";
import { useT } from "./i18n/index.ts";
import { searchDocuments } from "./search.ts";
import type { VaultView } from "./SideMenuContent.tsx";
import type { VaultData, VaultDocument } from "./types.ts";

type Props = {
  data: VaultData;
  view: VaultView;
  onSelectView: (view: VaultView) => void;
  onOpenDocument: (id: string) => void;
  onNewDocument: () => void;
  onScan: () => void;
  scannerAvailable: boolean;
};

function viewTitle(
  view: VaultView,
  data: VaultData,
  t: (key: "menu.allDocuments" | "menu.archive") => string,
): string {
  switch (view.kind) {
    case "all":
      return t("menu.allDocuments");
    case "archive":
      return t("menu.archive");
    case "tag":
      return `#${view.tag}`;
    case "category": {
      const cat = data.categories.find((c) => c.id === view.category);
      const base = cat?.name ?? view.category;
      return view.folder ? `${base} / ${view.folder}` : base;
    }
  }
}

export function DocumentListScreen({
  data,
  view,
  onSelectView,
  onOpenDocument,
  onNewDocument,
  onScan,
  scannerAvailable,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState("");

  const docs = useMemo(() => {
    if (query.trim()) {
      return searchDocuments(data.documents, query, {
        includeArchived: view.kind === "archive",
      }).map((h) => h.doc);
    }
    switch (view.kind) {
      case "all":
        return sortForList(filterDocuments(data.documents, {}));
      case "archive":
        return sortForList(data.documents.filter((d) => d.archived));
      case "tag":
        return sortForList(filterDocuments(data.documents, { tag: view.tag }));
      case "category":
        return sortForList(
          filterDocuments(data.documents, {
            category: view.category,
            folder: view.folder,
          }),
        );
    }
  }, [data.documents, view, query]);

  // The folder chips shown under a category heading — every folder in use.
  const folders =
    view.kind === "category"
      ? foldersInCategory(data.documents, view.category)
      : [];

  const categoryOf = (doc: VaultDocument) =>
    data.categories.find((c) => c.id === doc.category);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-fg-bright">
          {viewTitle(view, data, t)}
        </h1>
        {scannerAvailable && (
          <Button variant="secondary" onClick={onScan}>
            {t("list.scan")}
          </Button>
        )}
        <Button variant="primary" onClick={onNewDocument}>
          {t("list.addDocument")}
        </Button>
      </header>

      <div className="px-4 py-2">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder={t("list.searchPlaceholder")}
          className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {view.kind === "category" && folders.length > 0 && !query && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          <FolderChip
            label="/"
            active={view.folder === ""}
            onClick={() =>
              onSelectView({
                kind: "category",
                category: view.category,
                folder: "",
              })
            }
          />
          {folders.map((f) => (
            <FolderChip
              key={f}
              label={f}
              active={view.folder === f}
              onClick={() =>
                onSelectView({
                  kind: "category",
                  category: view.category,
                  folder: f,
                })
              }
            />
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {docs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {t("list.empty")}
          </p>
        ) : (
          docs.map((doc) => {
            const cat = categoryOf(doc);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onOpenDocument(doc.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"
              >
                <Glyph
                  name={
                    doc.file?.scanned ? "camera" : (cat?.glyph ?? "file-text")
                  }
                  paths={VAULT_GLYPH_PATHS}
                  className="h-5 w-5 shrink-0 text-muted"
                  style={cat?.color ? { color: cat.color } : undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {doc.favorite ? "★ " : ""}
                    {doc.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[cat?.name, doc.folder, ...doc.tags.map((x) => `#${x}`)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {doc.updatedAt.slice(0, 10)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function FolderChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-line text-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
