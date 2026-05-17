import {
  RoadmapModel,
  type RoadmapDoc,
  type RoadmapStatus,
} from "../models/roadmap.model.js";

export type CreateRoadmapInput = {
  userId: string;
  title: string;
  description?: string;
  status?: RoadmapStatus;
};

export type UpdateRoadmapInput = {
  title?: string;
  description?: string;
  status?: RoadmapStatus;
  progress?: number;
};

export class RoadmapRepository {
  async create(data: CreateRoadmapInput): Promise<RoadmapDoc> {
    const doc = await RoadmapModel.create({
      userId: data.userId,
      title: data.title,
      description: data.description ?? "",
      status: data.status ?? "in_progress",
      progress: 0,
    });
    return doc.toObject() as RoadmapDoc;
  }

  async findById(id: string): Promise<RoadmapDoc | null> {
    return (await RoadmapModel.findById(id).lean().exec()) as RoadmapDoc | null;
  }

  async findByUser(userId: string): Promise<RoadmapDoc[]> {
    return (await RoadmapModel.find({ userId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec()) as unknown as RoadmapDoc[];
  }

  async update(
    id: string,
    data: UpdateRoadmapInput,
  ): Promise<RoadmapDoc | null> {
    return (await RoadmapModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    )
      .lean()
      .exec()) as RoadmapDoc | null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await RoadmapModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}
