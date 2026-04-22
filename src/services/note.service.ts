import type { NoteRepository, UpdateNoteInput } from "../repositories/note.repository.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { NoteDoc } from "../models/note.model.js";

export type PublicNote = {
  id: string;
  title: string;
  content: string;
  documentId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function makeErr(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

function toPublic(note: NoteDoc): PublicNote {
  return {
    id: note._id.toString(),
    title: note.title,
    content: note.content,
    documentId: note.document.toString(),
    createdBy: note.createdBy.toString(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export class NoteService {
  constructor(
    noteRepository: NoteRepository,
    documentRepository: DocumentRepository,
  ) {
    this.noteRepository = noteRepository;
    this.documentRepository = documentRepository;
  }

  private readonly noteRepository: NoteRepository;
  private readonly documentRepository: DocumentRepository;

  private async assertDocumentAccess(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền truy cập document này", 403);
    }
  }

  /** Tạo ghi chú cho document (document có thể có nhiều ghi chú). */
  async create(
    input: { title: string; content?: string; documentId: string },
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicNote> {
    await this.assertDocumentAccess(
      input.documentId,
      requesterId,
      requesterRole,
    );

    const note = await this.noteRepository.create({
      title: input.title,
      content: input.content,
      documentId: input.documentId,
      createdBy: requesterId,
    });

    return toPublic(note);
  }

  /** Danh sách tất cả ghi chú của một document. */
  async listByDocument(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicNote[]> {
    await this.assertDocumentAccess(documentId, requesterId, requesterRole);

    const notes = await this.noteRepository.findAllByDocument(documentId);
    return notes.map(toPublic);
  }

  /** Lấy ghi chú theo ID của note. */
  async getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicNote> {
    const note = await this.noteRepository.findById(id);
    if (!note) throw makeErr("Không tìm thấy ghi chú", 404);
    if (
      requesterRole !== "admin" &&
      note.createdBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }
    return toPublic(note);
  }

  /** Danh sách ghi chú của người dùng hiện tại. */
  async listByUser(requesterId: string): Promise<PublicNote[]> {
    const notes = await this.noteRepository.findByUser(requesterId);
    return notes.map(toPublic);
  }

  async update(
    id: string,
    data: UpdateNoteInput,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicNote> {
    const note = await this.noteRepository.findById(id);
    if (!note) throw makeErr("Không tìm thấy ghi chú", 404);
    if (
      requesterRole !== "admin" &&
      note.createdBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }

    const updated = await this.noteRepository.update(id, data);
    if (!updated) throw makeErr("Cập nhật thất bại", 500);
    return toPublic(updated);
  }

  async deleteById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const note = await this.noteRepository.findById(id);
    if (!note) throw makeErr("Không tìm thấy ghi chú", 404);
    if (
      requesterRole !== "admin" &&
      note.createdBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }

    await this.noteRepository.deleteById(id);
  }
}
