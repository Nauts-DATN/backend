import { CourseModel, type CourseDoc } from "../models/course.model.js";

export type CreateCourseInput = {
  name: string;
  description?: string;
};

export class CourseRepository {
  async create(data: CreateCourseInput): Promise<CourseDoc> {
    const doc = await CourseModel.create(data);
    return doc.toObject() as CourseDoc;
  }

  async findById(id: string): Promise<CourseDoc | null> {
    return (await CourseModel.findById(id).lean().exec()) as CourseDoc | null;
  }

  async findAll(): Promise<CourseDoc[]> {
    return (await CourseModel.find().sort({ name: 1 }).lean().exec()) as unknown as CourseDoc[];
  }

  async update(
    id: string,
    data: Partial<CreateCourseInput>,
  ): Promise<CourseDoc | null> {
    return (await CourseModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec()) as CourseDoc | null;
  }

  async deleteById(id: string): Promise<boolean> {
    const r = await CourseModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
