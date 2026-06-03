import mongoose, { Schema, type Types } from "mongoose";

export interface ICourse {
  name: string;
  description?: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseDoc = ICourse & { _id: Types.ObjectId };

const courseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
  },
  { timestamps: true },
);

courseSchema.index(
  { userId: 1, name: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);

export const CourseModel =
  mongoose.models.Course ??
  mongoose.model<ICourse>("Course", courseSchema);
