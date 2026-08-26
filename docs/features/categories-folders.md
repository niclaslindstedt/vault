# Categories and folders

Every document lives in exactly one **category** — a top-level drawer with a
glyph and an accent colour. A fresh vault starts with a curated set
(Receipts, Insurance, Medical, Finance, Tax, Home, Vehicles, Travel, Legal,
Work, Education, Warranties, Identity, Other); all of them are editable and
your own can be added, each picking a mark from the app's large glyph
catalogue (`src/app/glyphs.ts`).

Inside a category, documents can carry a **folder** — a slash-separated path
like `Car/Volvo`. Folders are implicit: there is nothing to create or
delete; a folder exists exactly while a document points at it, and
intermediate levels are implied (`Car/Volvo` implies `Car`). Selecting a
folder shows its whole subtree.

Categories and folders _partition_ the vault. For the axis that _binds_
documents across the partition, see [tags](tags.md).
