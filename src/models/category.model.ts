import mongoose, { Schema, type Types } from "mongoose";

export interface ICategory {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDoc = ICategory & { _id: Types.ObjectId };

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

export const CategoryModel =
  mongoose.models.Category ??
  mongoose.model<ICategory>("Category", categorySchema);
