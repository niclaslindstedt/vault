// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The vault document's forward-only migration chain, run through the
// framework's migrator engine. Every read of the persisted metadata — from
// IndexedDB, a folder file, or a decrypted cloud document — passes through
// `migrateVault` before the app touches it, so old vaults upgrade silently
// and a *newer* vault (written by a future build) is refused with a clear
// error instead of being mangled.
//
// Adding a version: bump `VAULT_SCHEMA_VERSION` in `types.ts` and add a
// `MIGRATIONS[N]` step that upgrades a v`N` document to v`N+1`. Steps never
// change once shipped.

import { createMigrator } from "@niclaslindstedt/oss-framework/storage";

import { DEFAULT_CATEGORIES } from "./categories.ts";
import { logStore } from "./log.ts";
import { VAULT_SCHEMA_VERSION, emptyVault, type VaultData } from "./types.ts";

const migrator = createMigrator({
  latestVersion: VAULT_SCHEMA_VERSION,
  migrations: {
    // v0 → v1: v0 is "whatever was there before the schema existed" — an
    // absent or unversioned value. Normalise to an empty, seeded vault when
    // the shape is unusable; otherwise stamp the version and default the
    // collections.
    0: (doc) => {
      const documents = Array.isArray(doc.documents) ? doc.documents : [];
      const categories =
        Array.isArray(doc.categories) && doc.categories.length > 0
          ? doc.categories
          : DEFAULT_CATEGORIES;
      return { version: 1, categories, documents };
    },
  },
  logger: logStore.createLogger("migrations"),
});

/** Upgrade a raw persisted value to the current schema. `undefined`/null (a
 *  first run) yields a fresh vault seeded with the starter categories. */
export function migrateVault(raw: unknown): {
  data: VaultData;
  migrated: boolean;
} {
  if (raw == null) {
    return { data: emptyVault(DEFAULT_CATEGORIES), migrated: false };
  }
  const result = migrator.migrate(raw);
  return {
    data: result.data as unknown as VaultData,
    migrated: result.migrated,
  };
}
