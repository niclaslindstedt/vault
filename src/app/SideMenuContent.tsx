// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The side menu: All documents, the category tree (with per-category counts),
// the cross-cutting tag list, Archive, and the footer rows (Search /
// Settings). The framework `Sidebar` frames it; this is only the content.

import { Glyph } from "@niclaslindstedt/oss-framework/glyphs";

import { categoryCounts } from "./categories.ts";
import { VAULT_GLYPH_PATHS } from "./glyphs.ts";
import { useT } from "./i18n/index.ts";
import { tagCounts } from "./tags.ts";
import type { VaultData } from "./types.ts";

/** What the list screen is showing — the menu's selection state. */
export type VaultView =
  | { kind: "all" }
  | { kind: "category"; category: string; folder: string }
  | { kind: "tag"; tag: string }
  | { kind: "archive" };

export function viewKey(view: VaultView): string {
  switch (view.kind) {
    case "all":
      return "all";
    case "category":
      return `cat:${view.category}:${view.folder}`;
    case "tag":
      return `tag:${view.tag.toLowerCase()}`;
    case "archive":
      return "archive";
  }
}

type Props = {
  data: VaultData;
  view: VaultView;
  onSelect: (view: VaultView) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
};

function Row({
  active,
  onClick,
  glyph,
  color,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  glyph: string;
  color?: string;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        active ? "bg-surface-3 text-fg-bright" : "text-fg hover:bg-surface-2"
      }`}
    >
      <Glyph
        name={glyph}
        paths={VAULT_GLYPH_PATHS}
        className="h-4 w-4 shrink-0"
        style={color ? { color } : undefined}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="shrink-0 text-xs text-muted">{count}</span>
      )}
    </button>
  );
}

export function SideMenuContent({
  data,
  view,
  onSelect,
  onOpenSearch,
  onOpenSettings,
}: Props) {
  const t = useT();
  const key = viewKey(view);
  const counts = categoryCounts(data.documents);
  const tags = tagCounts(data.documents);
  const archivedCount = data.documents.filter((d) => d.archived).length;

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-2">
      <Row
        active={key === "all"}
        onClick={() => onSelect({ kind: "all" })}
        glyph="vault"
        label={t("menu.allDocuments")}
        count={data.documents.filter((d) => !d.archived).length}
      />

      <div className="mt-3 px-2 text-xs font-medium uppercase tracking-wide text-muted">
        {t("menu.categories")}
      </div>
      {data.categories.map((c) => (
        <Row
          key={c.id}
          active={
            key === viewKey({ kind: "category", category: c.id, folder: "" })
          }
          onClick={() =>
            onSelect({ kind: "category", category: c.id, folder: "" })
          }
          glyph={c.glyph}
          color={c.color}
          label={c.name}
          count={counts[c.id] ?? 0}
        />
      ))}

      {tags.size > 0 && (
        <>
          <div className="mt-3 px-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t("menu.tags")}
          </div>
          {[...tags.entries()].map(([tag, count]) => (
            <Row
              key={tag}
              active={key === viewKey({ kind: "tag", tag })}
              onClick={() => onSelect({ kind: "tag", tag })}
              glyph="tag"
              label={tag}
              count={count}
            />
          ))}
        </>
      )}

      <div className="mt-3">
        <Row
          active={key === "archive"}
          onClick={() => onSelect({ kind: "archive" })}
          glyph="archive"
          label={t("menu.archive")}
          count={archivedCount}
        />
      </div>

      <div className="mt-auto border-t border-line pt-2">
        <Row
          active={false}
          onClick={onOpenSearch}
          glyph="search"
          label={t("menu.search")}
        />
        <Row
          active={false}
          onClick={onOpenSettings}
          glyph="gear"
          label={t("menu.settings")}
        />
      </div>
    </div>
  );
}
