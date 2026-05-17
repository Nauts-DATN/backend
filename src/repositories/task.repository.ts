import { TaskModel, type TaskDoc } from "../models/task.model.js";

export type CreateTaskInput = {
  roadmapId: string;
  documentId?: string;
  title: string;
  description?: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  documentId?: string | null;
  isCompleted?: boolean;
  completedAt?: Date | null;
};

export class TaskRepository {
  async create(data: CreateTaskInput): Promise<TaskDoc> {
    const doc = await TaskModel.create({
      roadmapId: data.roadmapId,
      documentId: data.documentId ?? null,
      title: data.title,
      description: data.description ?? "",
      isCompleted: false,
      completedAt: null,
    });
    return doc.toObject() as TaskDoc;
  }

  async findById(id: string): Promise<TaskDoc | null> {
    return (await TaskModel.findById(id).lean().exec()) as TaskDoc | null;
  }

  async findByRoadmap(roadmapId: string): Promise<TaskDoc[]> {
    return (await TaskModel.find({ roadmapId })
      .sort({ createdAt: 1 })
      .lean()
      .exec()) as unknown as TaskDoc[];
  }

  async update(id: string, data: UpdateTaskInput): Promise<TaskDoc | null> {
    return (await TaskModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    )
      .lean()
      .exec()) as TaskDoc | null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await TaskModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteByRoadmap(roadmapId: string): Promise<void> {
    await TaskModel.deleteMany({ roadmapId }).exec();
  }

  async countByRoadmap(roadmapId: string): Promise<{
    total: number;
    completed: number;
  }> {
    const [total, completed] = await Promise.all([
      TaskModel.countDocuments({ roadmapId }).exec(),
      TaskModel.countDocuments({ roadmapId, isCompleted: true }).exec(),
    ]);
    return { total, completed };
  }
}
