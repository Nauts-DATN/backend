import mongoose, { Schema, type Types } from "mongoose";

export const ROADMAP_STATUS = ["in_progress", "completed"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUS)[number];

export interface IRoadmap {
  userId: Types.ObjectId;
  title: string;
  description: string;
  progress: number;
  status: RoadmapStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type RoadmapDoc = IRoadmap & { _id: Types.ObjectId };

const roadmapSchema = new Schema<IRoadmap>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ROADMAP_STATUS,
      default: "in_progress",
      index: true,
    },
  },
  { timestamps: true },
);

export const RoadmapModel =
  mongoose.models.Roadmap ??
  mongoose.model<IRoadmap>("Roadmap", roadmapSchema);
