// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app shell: the framework `Sidebar` frames the navigation (docked on
// wide screens, a draggable drawer on phones); the app owns the vault store,
// the list screen, the editor / scanner / settings modals, and the storage
// engine. Built from the framework's shared surface the same way the demo
// and the contacts reference app are.

import { useEffect, useState } from "react";

import { useApplyTheme } from "@niclaslindstedt/oss-framework/theme";
import {
  Sidebar,
  usePersistentMenuPosition,
  useSidebarInset,
} from "@niclaslindstedt/oss-framework/sidebar";
import { UpdateToast, usePwaUpdate } from "@niclaslindstedt/oss-framework/pwa";
import { useMediaQuery } from "@niclaslindstedt/oss-framework/hooks";
import { glyphDataUri } from "@niclaslindstedt/oss-framework/glyphs";
import { applyFaviconHref } from "@niclaslindstedt/oss-framework/namespaces";

import { DocumentListScreen } from "./app/DocumentListScreen.tsx";
import { DocumentModal } from "./app/DocumentModal.tsx";
import { ScanModal } from "./app/ScanModal.tsx";
import { SettingsModal } from "./app/SettingsModal.tsx";
import { SideMenuContent, type VaultView } from "./app/SideMenuContent.tsx";
import { APP_LOOK } from "./app/look.ts";
import { cacheIdForBase } from "./app/pwa.ts";
import { isScannerAvailable } from "./app/scanner.ts";
import { useAppSettings } from "./app/useAppSettings.ts";
import { useStorage } from "./app/useStorage.ts";
import { useVaultStore } from "./app/useVaultStore.ts";
import { useT } from "./app/i18n/index.ts";

export function App() {
  const t = useT();
  useApplyTheme(APP_LOOK);

  const store = useVaultStore();
  const { settings, setSettings } = useAppSettings();
  const storage = useStorage(store, settings.storage);

  const [view, setView] = useState<VaultView>({ kind: "all" });
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Wide screens dock the sidebar permanently; phones collapse it to a
  // draggable drawer.
  const pinned = useMediaQuery("(min-width: 768px)");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [position, setPosition] = usePersistentMenuPosition(
    "vault:menu-position",
  );
  useSidebarInset(pinned, position.side);

  // The real PWA update lifecycle, against the worker `pwa-plugin.ts` emits.
  const pwa = usePwaUpdate({
    base: import.meta.env.BASE_URL,
    cacheId: cacheIdForBase(import.meta.env.BASE_URL),
    enabled: !import.meta.env.DEV,
  });

  // Re-badge the browser tab with the active category's glyph.
  const activeCategory =
    view.kind === "category"
      ? store.data?.categories.find((c) => c.id === view.category)
      : undefined;
  useEffect(() => {
    applyFaviconHref(
      glyphDataUri(activeCategory?.glyph ?? "folder", "#86efac", {
        background: "#0b0d10",
      }),
    );
  }, [activeCategory]);

  // Scanner capture → a new document in the active category with the scan
  // attached, then straight into the editor (where OCR is one tap away).
  const handleCaptured = (blob: Blob, fileName: string) => {
    const category =
      view.kind === "category"
        ? view.category
        : (store.data?.categories[0]?.id ?? "other");
    const doc = store.addDocument({
      title: fileName.replace(/\.jpg$/, ""),
      category,
      folder: view.kind === "category" ? view.folder : "",
    });
    void store
      .attachFile(doc.id, blob, {
        name: fileName,
        mime: "image/jpeg",
        scanned: true,
      })
      .then(() => setOpenDocId(doc.id));
  };

  const handleNewDocument = () => {
    const category =
      view.kind === "category"
        ? view.category
        : (store.data?.categories[0]?.id ?? "other");
    const doc = store.addDocument({
      title: "",
      category,
      folder: view.kind === "category" ? view.folder : "",
      tags: view.kind === "tag" ? [view.tag] : [],
    });
    setOpenDocId(doc.id);
  };

  if (!store.data) {
    return <div className="h-[100svh] bg-page-bg" aria-busy="true" />;
  }

  return (
    <div className="flex h-[100svh] overflow-hidden bg-page-bg text-fg">
      <Sidebar
        pinned={pinned}
        open={drawerOpen}
        onToggle={() => setDrawerOpen((v) => !v)}
        onClose={() => setDrawerOpen(false)}
        position={position}
        onPositionChange={setPosition}
        showButton={!pinned}
        swipeToClose
        panelScroll={false}
        labels={{
          nav: t("menu.nav"),
          open: t("menu.open"),
          close: t("menu.closeMenu"),
        }}
      >
        <SideMenuContent
          data={store.data}
          view={view}
          onSelect={(v) => {
            setView(v);
            if (!pinned) setDrawerOpen(false);
          }}
          onOpenSearch={() => {
            setDrawerOpen(false);
            // Search lives inline on the list screen; jump to All documents.
            setView({ kind: "all" });
          }}
          onOpenSettings={() => {
            setDrawerOpen(false);
            setSettingsOpen(true);
          }}
        />
      </Sidebar>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <DocumentListScreen
          data={store.data}
          view={view}
          onSelectView={setView}
          onOpenDocument={setOpenDocId}
          onNewDocument={handleNewDocument}
          onScan={() => setScanOpen(true)}
          scannerAvailable={isScannerAvailable()}
        />
      </main>

      <DocumentModal
        open={openDocId !== null}
        onClose={() => setOpenDocId(null)}
        data={store.data}
        store={store}
        docId={openDocId}
        ocrLang={settings.ocrLang}
      />

      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onCaptured={handleCaptured}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        storage={storage}
      />

      {/* The framework's PWA "a new version is ready" prompt. */}
      <UpdateToast
        needRefresh={pwa.needRefresh}
        incomingVersion={pwa.incomingVersion}
        onReload={pwa.reload}
        onDismiss={pwa.dismiss}
      />
    </div>
  );
}
