import mongoose, { Schema } from "mongoose";

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  role: UserRole;
  isBlocked?: boolean;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationCodeHash?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
    },
    isBlocked: { type: Boolean, default: false, index: true },
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerificationTokenHash: {
      type: String,
      sparse: true,
      index: true,
      select: false,
    },
    emailVerificationCodeHash: {
      type: String,
      sparse: true,
      select: false,
    },
    emailVerificationExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const UserModel =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
