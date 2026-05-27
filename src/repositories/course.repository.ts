import { CourseModel, type CourseDoc } from "../models/course.model.js";

export type CreateCourseInput = {
  name: string;
  description?: string;
  userId: string;
};

export class CourseRepository {
  async create(data: CreateCourseInput): Promise<CourseDoc> {
    const doc = await CourseModel.create(data);
    return doc.toObject() as CourseDoc;
  }

  async findById(id: string): Promise<CourseDoc | null> {
    return (await CourseModel.findById(id).lean().exec()) as CourseDoc | null;
  }

  async findByUser(userId: string): Promise<CourseDoc[]> {
    return (await CourseModel.find({ userId })
      .sort({ name: 1 })
      .lean()
      .exec()) as unknown as CourseDoc[];
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
