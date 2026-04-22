import mongoose, { Schema, type Types } from "mongoose";

export interface INote {
  title: string;
  content: string;
  document: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDoc = INote & { _id: Types.ObjectId };

const noteSchema = new Schema<INote>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const NoteModel =
  mongoose.models.Note ?? mongoose.model<INote>("Note", noteSchema);
