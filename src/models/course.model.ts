import mongoose, { Schema, type Types } from "mongoose";

export interface ICourse {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseDoc = ICourse & { _id: Types.ObjectId };

const courseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

export const CourseModel =
  mongoose.models.Course ??
  mongoose.model<ICourse>("Course", courseSchema);
