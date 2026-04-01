import mongoose, { Schema } from "mongoose";

export interface IUser {
  email: string;
  name: string;
  avatarKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    avatarKey: { type: String },
  },
  { timestamps: true },
);

export const UserModel =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
