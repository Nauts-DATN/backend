import mongoose, { Schema } from "mongoose";

export interface IMigrationRecord {
  name: string;
  appliedAt: Date;
}

const schema = new Schema<IMigrationRecord>(
  {
    name: { type: String, required: true, unique: true, index: true },
    appliedAt: { type: Date, default: () => new Date() },
  },
  { collection: "_migration_records" },
);

export const MigrationRecordModel =
  mongoose.models.MigrationRecord ??
  mongoose.model<IMigrationRecord>("MigrationRecord", schema);
