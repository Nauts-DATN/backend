import { SystemReportModel, type SystemReportDoc } from "../models/system-report.model.js";

export type CreateSystemReportInput = {
  title: string;
  description: string;
  reportedBy: string;
};

export class SystemReportRepository {
  async create(data: CreateSystemReportInput): Promise<SystemReportDoc> {
    const report = await SystemReportModel.create({
      title: data.title,
      description: data.description,
      reportedBy: data.reportedBy,
      status: "processing",
    });
    return report.toObject() as SystemReportDoc;
  }

  async findById(id: string): Promise<SystemReportDoc | null> {
    const report = await SystemReportModel.findById(id)
      .populate("reportedBy", "name email")
      .lean()
      .exec();
    return report as unknown as SystemReportDoc | null;
  }

  async findByUser(userId: string): Promise<SystemReportDoc[]> {
    const reports = await SystemReportModel.find({ reportedBy: userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return reports as unknown as SystemReportDoc[];
  }

  async findAll(limit = 500): Promise<SystemReportDoc[]> {
    const reports = await SystemReportModel.find()
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return reports as unknown as SystemReportDoc[];
  }

  async markCompleted(id: string): Promise<SystemReportDoc | null> {
    const report = await SystemReportModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
        },
      },
      { new: true },
    )
      .populate("reportedBy", "name email")
      .lean()
      .exec();
    return report as unknown as SystemReportDoc | null;
  }
}
