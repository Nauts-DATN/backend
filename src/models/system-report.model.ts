import mongoose, { Schema, type Types } from "mongoose";

export const SYSTEM_REPORT_STATUSES = ["processing", "completed"] as const;
export type SystemReportStatus = (typeof SYSTEM_REPORT_STATUSES)[number];

export interface ISystemReport {
  title: string;
  description: string;
  status: SystemReportStatus;
  reportedBy: Types.ObjectId;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SystemReportDoc = ISystemReport & { _id: Types.ObjectId };

const systemReportSchema = new Schema<ISystemReport>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: SYSTEM_REPORT_STATUSES,
      default: "processing",
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

systemReportSchema.index({ reportedBy: 1, createdAt: -1 });

export const SystemReportModel =
  mongoose.models.SystemReport ??
  mongoose.model<ISystemReport>("SystemReport", systemReportSchema);
