import type { Types } from "mongoose";
import { UserModel, type IUser } from "../models/user.model.js";

export type CreateUserInput = Pick<IUser, "email" | "name">;

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id).lean().exec();
    return doc as IUser | null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    return doc as IUser | null;
  }

  async create(data: CreateUserInput): Promise<IUser & { _id: Types.ObjectId }> {
    const doc = await UserModel.create({
      ...data,
      email: data.email.toLowerCase(),
    });
    return doc.toObject() as IUser & { _id: Types.ObjectId };
  }

  async setAvatarKey(
    userId: string,
    avatarKey: string | undefined,
  ): Promise<IUser | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { avatarKey } },
      { new: true },
    )
      .lean()
      .exec();
    return doc as IUser | null;
  }

  async list(limit = 50): Promise<IUser[]> {
    const docs = await UserModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as IUser[];
  }
}
