import { NoteModel, type NoteDoc } from "../models/note.model.js";

export type CreateNoteInput = {
  title: string;
  content?: string;
  documentId: string;
  createdBy: string;
};

export type UpdateNoteInput = {
  title?: string;
  content?: string;
};

export class NoteRepository {
  async create(data: CreateNoteInput): Promise<NoteDoc> {
    const doc = await NoteModel.create({
      title: data.title,
      content: data.content ?? "",
      document: data.documentId,
      createdBy: data.createdBy,
    });
    return doc.toObject() as NoteDoc;
  }

  async findById(id: string): Promise<NoteDoc | null> {
    return (await NoteModel.findById(id).lean().exec()) as NoteDoc | null;
  }

  async findAllByDocument(documentId: string): Promise<NoteDoc[]> {
    return (await NoteModel.find({ document: documentId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec()) as unknown as NoteDoc[];
  }

  async findByUser(userId: string): Promise<NoteDoc[]> {
    return (await NoteModel.find({ createdBy: userId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec()) as unknown as NoteDoc[];
  }

  async update(id: string, data: UpdateNoteInput): Promise<NoteDoc | null> {
    return (await NoteModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    )
      .lean()
      .exec()) as NoteDoc | null;
  }

  async deleteById(id: string): Promise<boolean> {
    const r = await NoteModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
