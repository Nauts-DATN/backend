import mongoose, { Schema } from "mongoose";

export interface ISeedRecord {
  name: string;
  appliedAt: Date;
}

const schema = new Schema<ISeedRecord>(
  {
    name: { type: String, required: true, unique: true, index: true },
    appliedAt: { type: Date, default: () => new Date() },
  },
  { collection: "_seed_records" },
);

export const SeedRecordModel =
  mongoose.models.SeedRecord ??
  mongoose.model<ISeedRecord>("SeedRecord", schema);
