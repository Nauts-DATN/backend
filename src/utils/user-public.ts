import type { Types } from "mongoose";
import type { IUser, UserRole } from "../models/user.model.js";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(
  u: IUser & { _id: Types.ObjectId },
): PublicUser {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    role: u.role,
    emailVerified: u.emailVerified ?? false,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
