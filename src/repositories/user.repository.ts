import type { Types } from "mongoose";
import { UserModel, type IUser, type UserRole } from "../models/user.model.js";

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationCodeHash?: string;
  emailVerificationExpires?: Date;
};

export class UserRepository {
  async findById(id: string): Promise<(IUser & { _id: Types.ObjectId }) | null> {
    const doc = await UserModel.findById(id).lean().exec();
    return doc as (IUser & { _id: Types.ObjectId }) | null;
  }

  async findByIdWithRefreshToken(
    id: string,
  ): Promise<
    | (IUser & { _id: Types.ObjectId; refreshTokenHash?: string })
    | null
  > {
    const doc = await UserModel.findById(id)
      .select("+refreshTokenHash")
      .lean()
      .exec();
    return doc as
      | (IUser & { _id: Types.ObjectId; refreshTokenHash?: string })
      | null;
  }

  async findByEmail(email: string): Promise<(IUser & { _id: Types.ObjectId }) | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    return doc as (IUser & { _id: Types.ObjectId }) | null;
  }

  /** Dùng khi đăng nhập — có password. */
  async findByEmailWithPassword(
    email: string,
  ): Promise<(IUser & { _id: Types.ObjectId; password: string }) | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select("+password")
      .lean()
      .exec();
    return doc as (IUser & { _id: Types.ObjectId; password: string }) | null;
  }

  async findByIdWithPassword(
    id: string,
  ): Promise<(IUser & { _id: Types.ObjectId; password: string }) | null> {
    const doc = await UserModel.findById(id).select("+password").lean().exec();
    return doc as (IUser & { _id: Types.ObjectId; password: string }) | null;
  }

  async findByVerificationTokenHash(
    hash: string,
  ): Promise<
    | (IUser & {
        _id: Types.ObjectId;
        emailVerificationTokenHash: string;
        emailVerificationExpires?: Date;
      })
    | null
  > {
    const doc = await UserModel.findOne({ emailVerificationTokenHash: hash })
      .select("+emailVerificationTokenHash +emailVerificationExpires")
      .lean()
      .exec();
    return doc as
      | (IUser & {
          _id: Types.ObjectId;
          emailVerificationTokenHash: string;
          emailVerificationExpires?: Date;
        })
      | null;
  }

  async create(
    data: CreateUserInput,
  ): Promise<IUser & { _id: Types.ObjectId }> {
    const doc = await UserModel.create({
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password,
      role: data.role ?? "user",
      emailVerified: data.emailVerified ?? false,
      emailVerificationTokenHash: data.emailVerificationTokenHash,
      emailVerificationCodeHash: data.emailVerificationCodeHash,
      emailVerificationExpires: data.emailVerificationExpires,
    });
    const obj = doc.toObject();
    delete (obj as { password?: string }).password;
    delete (obj as { emailVerificationTokenHash?: string })
      .emailVerificationTokenHash;
    delete (obj as { emailVerificationExpires?: Date })
      .emailVerificationExpires;
    delete (obj as { emailVerificationCodeHash?: string })
      .emailVerificationCodeHash;
    return obj as IUser & { _id: Types.ObjectId };
  }

  async markEmailVerified(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { emailVerified: true },
      $unset: {
        emailVerificationTokenHash: 1,
        emailVerificationCodeHash: 1,
        emailVerificationExpires: 1,
      },
    }).exec();
  }

  async setEmailVerificationData(
    userId: string,
    data: {
      tokenHash: string;
      codeHash: string;
      expires: Date;
    },
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        emailVerificationTokenHash: data.tokenHash,
        emailVerificationCodeHash: data.codeHash,
        emailVerificationExpires: data.expires,
      },
    }).exec();
  }

  /** Xác thực bằng mã — cần hash mã + hạn. */
  async findByEmailWithVerificationCode(
    email: string,
  ): Promise<
    | (IUser & {
        _id: Types.ObjectId;
        emailVerificationCodeHash: string;
        emailVerificationExpires?: Date;
      })
    | null
  > {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select("+emailVerificationCodeHash +emailVerificationExpires")
      .lean()
      .exec();
    return doc as
      | (IUser & {
          _id: Types.ObjectId;
          emailVerificationCodeHash: string;
          emailVerificationExpires?: Date;
        })
      | null;
  }

  async setAvatar(
    userId: string,
    avatar: string | undefined,
  ): Promise<(IUser & { _id: Types.ObjectId }) | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { avatar } },
      { new: true },
    )
      .lean()
      .exec();
    return doc as (IUser & { _id: Types.ObjectId }) | null;
  }

  async setPasswordResetData(
    userId: string,
    data: {
      codeHash: string;
      expires: Date;
    },
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        passwordResetCodeHash: data.codeHash,
        passwordResetExpires: data.expires,
      },
    }).exec();
  }

  async findByEmailWithPasswordResetCode(
    email: string,
  ): Promise<
    | (IUser & {
        _id: Types.ObjectId;
        passwordResetCodeHash?: string;
        passwordResetExpires?: Date;
      })
    | null
  > {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select("+passwordResetCodeHash +passwordResetExpires")
      .lean()
      .exec();
    return doc as
      | (IUser & {
          _id: Types.ObjectId;
          passwordResetCodeHash?: string;
          passwordResetExpires?: Date;
        })
      | null;
  }

  async updateName(
    userId: string,
    name: string,
  ): Promise<(IUser & { _id: Types.ObjectId }) | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { name } },
      { new: true },
    )
      .lean()
      .exec();
    return doc as (IUser & { _id: Types.ObjectId }) | null;
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { password },
    }).exec();
  }

  async updatePasswordAndClearReset(userId: string, password: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { password },
      $unset: {
        passwordResetCodeHash: 1,
        passwordResetExpires: 1,
        refreshTokenHash: 1,
      },
    }).exec();
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { refreshTokenHash },
    }).exec();
  }

  async clearRefreshTokenHash(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1 },
    }).exec();
  }

  async setBlocked(
    userId: string,
    isBlocked: boolean,
  ): Promise<(IUser & { _id: Types.ObjectId }) | null> {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { isBlocked } },
      { new: true },
    )
      .lean()
      .exec();
    return doc as (IUser & { _id: Types.ObjectId }) | null;
  }

  async deleteById(userId: string): Promise<boolean> {
    const res = await UserModel.findByIdAndDelete(userId).exec();
    return !!res;
  }

  async list(
    limit = 50,
    search?: string,
  ): Promise<(IUser & { _id: Types.ObjectId })[]> {
    const query = search?.trim()
      ? {
          $or: [
            { name: { $regex: search.trim(), $options: "i" } },
            { email: { $regex: search.trim(), $options: "i" } },
          ],
        }
      : {};
    const docs = await UserModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as (IUser & { _id: Types.ObjectId })[];
  }
}
