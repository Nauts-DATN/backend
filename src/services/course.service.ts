import type { CourseRepository, CreateCourseInput } from "../repositories/course.repository.js";
import type { CourseDoc } from "../models/course.model.js";
import type { Types } from "mongoose";

export type PublicCourse = {
  id: string;
  name: string;
  description?: string;
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
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class CourseService {
  constructor(courseRepository: CourseRepository) {
    this.courseRepository = courseRepository;
  }

  private readonly courseRepository: CourseRepository;

  async list(): Promise<PublicCourse[]> {
    const docs = await this.courseRepository.findAll();
    return docs.map((d) => toPublic(d as CourseDoc & { _id: Types.ObjectId }));
  }

  async getById(id: string): Promise<PublicCourse> {
    const doc = await this.courseRepository.findById(id);
    if (!doc) throw makeErr("Không tìm thấy course", 404);
    return toPublic(doc as CourseDoc & { _id: Types.ObjectId });
  }

  async create(data: CreateCourseInput): Promise<PublicCourse> {
    try {
      const doc = await this.courseRepository.create(data);
      return toPublic(doc as CourseDoc & { _id: Types.ObjectId });
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 11000) {
        throw makeErr("Tên course đã tồn tại", 409);
      }
      throw e;
    }
  }

  async update(id: string, data: Partial<CreateCourseInput>): Promise<PublicCourse> {
    const doc = await this.courseRepository.update(id, data);
    if (!doc) throw makeErr("Không tìm thấy course", 404);
    return toPublic(doc as CourseDoc & { _id: Types.ObjectId });
  }

  async deleteById(id: string): Promise<void> {
    const ok = await this.courseRepository.deleteById(id);
    if (!ok) throw makeErr("Không tìm thấy course", 404);
  }
}
