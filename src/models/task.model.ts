import mongoose, { Schema, type Types } from "mongoose";

export interface ITask {
  roadmapId: Types.ObjectId;
  documentId?: Types.ObjectId | null;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskDoc = ITask & { _id: Types.ObjectId };

const taskSchema = new Schema<ITask>(
  {
    roadmapId: {
      type: Schema.Types.ObjectId,
      ref: "Roadmap",
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    isCompleted: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const TaskModel =
  mongoose.models.Task ?? mongoose.model<ITask>("Task", taskSchema);
