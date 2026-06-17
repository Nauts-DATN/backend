import type { Types } from "mongoose";
import type {
  CreateSystemReportInput,
  SystemReportRepository,
} from "../repositories/system-report.repository.js";
import type {
  SystemReportDoc,
  SystemReportStatus,
} from "../models/system-report.model.js";

function makeErr(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

type ReporterPublic = {
  id: string;
  name?: string;
  email?: string;
};

export type PublicSystemReport = {
  id: string;
  title: string;
  description: string;
  status: SystemReportStatus;
  reportedBy: string;
  reporter?: ReporterPublic;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function readReporter(value: unknown): { reportedBy: string; reporter?: ReporterPublic } {
  if (typeof value === "string") return { reportedBy: value };

  const maybeReporter = value as
    | {
        _id?: Types.ObjectId | string;
        name?: string;
        email?: string;
        toString?: () => string;
      }
    | undefined;

  if (maybeReporter?._id) {
    const id = maybeReporter._id.toString();
    return {
      reportedBy: id,
      reporter: {
        id,
        name: maybeReporter.name,
        email: maybeReporter.email,
      },
    };
  }

  return { reportedBy: maybeReporter?.toString?.() ?? "" };
}

function toPublic(doc: SystemReportDoc): PublicSystemReport {
  const reporter = readReporter(doc.reportedBy);
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    status: doc.status,
    reportedBy: reporter.reportedBy,
    reporter: reporter.reporter,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class SystemReportService {
  constructor(systemReportRepository: SystemReportRepository) {
    this.systemReportRepository = systemReportRepository;
  }

  private readonly systemReportRepository: SystemReportRepository;

  async create(input: CreateSystemReportInput): Promise<PublicSystemReport> {
    const report = await this.systemReportRepository.create(input);
    return toPublic(report);
  }

  async listMine(userId: string): Promise<PublicSystemReport[]> {
    const reports = await this.systemReportRepository.findByUser(userId);
    return reports.map(toPublic);
  }

  async listAll(): Promise<PublicSystemReport[]> {
    const reports = await this.systemReportRepository.findAll();
    return reports.map(toPublic);
  }

  async getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicSystemReport> {
    const report = await this.systemReportRepository.findById(id);
    if (!report) throw makeErr("Khong tim thay bao cao loi", 404);

    const { reportedBy } = readReporter(report.reportedBy);
    if (requesterRole !== "admin" && reportedBy !== requesterId) {
      throw makeErr("Khong co quyen", 403);
    }

    return toPublic(report);
  }

  async markCompleted(id: string): Promise<PublicSystemReport> {
    const report = await this.systemReportRepository.markCompleted(id);
    if (!report) throw makeErr("Khong tim thay bao cao loi", 404);
    return toPublic(report);
  }
}
