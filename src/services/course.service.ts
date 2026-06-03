import type {
  CourseRepository,
  CreateCourseInput,
} from "../repositories/course.repository.js";
import type { CourseDoc } from "../models/course.model.js";
import type { Types } from "mongoose";

export type PublicCourse = {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

function makeErr(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

function toPublic(doc: CourseDoc & { _id: Types.ObjectId }): PublicCourse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    userId: doc.userId.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class CourseService {
  constructor(courseRepository: CourseRepository) {
    this.courseRepository = courseRepository;
  }

  private readonly courseRepository: CourseRepository;

  async list(userId: string): Promise<PublicCourse[]> {
    const docs = await this.courseRepository.findByUser(userId);
    return docs.map((d) => toPublic(d as CourseDoc & { _id: Types.ObjectId }));
  }

  async getById(id: string, userId: string): Promise<PublicCourse> {
    const doc = await this.courseRepository.findById(id);
    if (!doc) throw makeErr("Không tìm thấy course", 404);
    if (doc.userId.toString() !== userId) {
      throw makeErr("Không có quyền truy cập course này", 403);
    }
    return toPublic(doc as CourseDoc & { _id: Types.ObjectId });
  }

  async create(
    data: Omit<CreateCourseInput, "userId">,
    userId: string,
  ): Promise<PublicCourse> {
    try {
      const doc = await this.courseRepository.create({
        name: data.name,
        description: data.description,
        userId,
      });
      return toPublic(doc as CourseDoc & { _id: Types.ObjectId });
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 11000) {
        throw makeErr("Tên course đã tồn tại trong thư viện của bạn", 409);
      }
      throw e;
    }
  }

  async update(
    id: string,
    data: Partial<Omit<CreateCourseInput, "userId">>,
    userId: string,
  ): Promise<PublicCourse> {
    const existing = await this.courseRepository.findById(id);
    if (!existing) throw makeErr("Không tìm thấy course", 404);
    if (existing.userId.toString() !== userId) {
      throw makeErr("Không có quyền sửa course này", 403);
    }
    const doc = await this.courseRepository.update(id, data);
    if (!doc) throw makeErr("Không tìm thấy course", 404);
    return toPublic(doc as CourseDoc & { _id: Types.ObjectId });
  }

  async deleteById(id: string, userId: string): Promise<void> {
    const existing = await this.courseRepository.findById(id);
    if (!existing) throw makeErr("Không tìm thấy course", 404);
    if (existing.userId.toString() !== userId) {
      throw makeErr("Không có quyền xóa course này", 403);
    }
    const ok = await this.courseRepository.deleteById(id);
    if (!ok) throw makeErr("Không tìm thấy course", 404);
  }
}
