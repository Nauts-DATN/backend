import type { CategoryRepository, CreateCategoryInput } from "../repositories/category.repository.js";
import type { CategoryDoc } from "../models/category.model.js";
import type { Types } from "mongoose";

export type PublicCategory = {
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

function toPublic(doc: CategoryDoc & { _id: Types.ObjectId }): PublicCategory {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class CategoryService {
  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  private readonly categoryRepository: CategoryRepository;

  async list(): Promise<PublicCategory[]> {
    const docs = await this.categoryRepository.findAll();
    return docs.map((d) => toPublic(d as CategoryDoc & { _id: Types.ObjectId }));
  }

  async getById(id: string): Promise<PublicCategory> {
    const doc = await this.categoryRepository.findById(id);
    if (!doc) throw makeErr("Không tìm thấy category", 404);
    return toPublic(doc as CategoryDoc & { _id: Types.ObjectId });
  }

  async create(data: CreateCategoryInput): Promise<PublicCategory> {
    try {
      const doc = await this.categoryRepository.create(data);
      return toPublic(doc as CategoryDoc & { _id: Types.ObjectId });
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 11000) {
        throw makeErr("Tên category đã tồn tại", 409);
      }
      throw e;
    }
  }

  async update(id: string, data: Partial<CreateCategoryInput>): Promise<PublicCategory> {
    const doc = await this.categoryRepository.update(id, data);
    if (!doc) throw makeErr("Không tìm thấy category", 404);
    return toPublic(doc as CategoryDoc & { _id: Types.ObjectId });
  }

  async deleteById(id: string): Promise<void> {
    const ok = await this.categoryRepository.deleteById(id);
    if (!ok) throw makeErr("Không tìm thấy category", 404);
  }
}
