import { CategoryModel, type CategoryDoc } from "../models/category.model.js";

export type CreateCategoryInput = {
  name: string;
  description?: string;
};

export class CategoryRepository {
  async create(data: CreateCategoryInput): Promise<CategoryDoc> {
    const doc = await CategoryModel.create(data);
    return doc.toObject() as CategoryDoc;
  }

  async findById(id: string): Promise<CategoryDoc | null> {
    return (await CategoryModel.findById(id).lean().exec()) as CategoryDoc | null;
  }

  async findAll(): Promise<CategoryDoc[]> {
    return (await CategoryModel.find().sort({ name: 1 }).lean().exec()) as unknown as CategoryDoc[];
  }

  async update(
    id: string,
    data: Partial<CreateCategoryInput>,
  ): Promise<CategoryDoc | null> {
    return (await CategoryModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec()) as CategoryDoc | null;
  }

  async deleteById(id: string): Promise<boolean> {
    const r = await CategoryModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
