import type { BaseMigration } from "../../interfaces/base-migration.js";
import { NoteModel } from "../../models/note.model.js";

export const migration004SyncNoteIndexes: BaseMigration = {
  name: "004_sync_note_indexes",
  async up() {
    const indexes = await NoteModel.collection.indexes();
    const staleUniqueDocumentIndex = indexes.find(
      (index) => index.name === "document_1" && index.unique === true,
    );

    if (staleUniqueDocumentIndex?.name) {
      await NoteModel.collection.dropIndex(staleUniqueDocumentIndex.name);
    }

    await NoteModel.syncIndexes();
  },
};
