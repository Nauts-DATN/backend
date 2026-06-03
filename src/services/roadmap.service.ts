import type {
  RoadmapRepository,
  UpdateRoadmapInput,
} from "../repositories/roadmap.repository.js";
import type {
  TaskRepository,
  UpdateTaskInput,
} from "../repositories/task.repository.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { RoadmapDoc, RoadmapStatus } from "../models/roadmap.model.js";
import type { TaskDoc } from "../models/task.model.js";

export type PublicTask = {
  id: string;
  roadmapId: string;
  documentId: string | null;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicRoadmap = {
  id: string;
  userId: string;
  title: string;
  description: string;
  progress: number;
  status: RoadmapStatus;
  createdAt: string;
  updatedAt: string;
};

export type RoadmapDetail = PublicRoadmap & {
  tasks: PublicTask[];
};

function makeErr(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

function toPublicRoadmap(roadmap: RoadmapDoc): PublicRoadmap {
  return {
    id: roadmap._id.toString(),
    userId: roadmap.userId.toString(),
    title: roadmap.title,
    description: roadmap.description,
    progress: roadmap.progress,
    status: roadmap.status,
    createdAt: roadmap.createdAt.toISOString(),
    updatedAt: roadmap.updatedAt.toISOString(),
  };
}

function toPublicTask(task: TaskDoc): PublicTask {
  return {
    id: task._id.toString(),
    roadmapId: task.roadmapId.toString(),
    documentId: task.documentId?.toString() ?? null,
    title: task.title,
    description: task.description,
    isCompleted: task.isCompleted,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class RoadmapService {
  constructor(
    roadmapRepository: RoadmapRepository,
    taskRepository: TaskRepository,
    documentRepository: DocumentRepository,
  ) {
    this.roadmapRepository = roadmapRepository;
    this.taskRepository = taskRepository;
    this.documentRepository = documentRepository;
  }

  private readonly roadmapRepository: RoadmapRepository;
  private readonly taskRepository: TaskRepository;
  private readonly documentRepository: DocumentRepository;

  private assertRoadmapAccess(
    roadmap: RoadmapDoc,
    requesterId: string,
    requesterRole: string,
  ): void {
    if (requesterRole !== "admin" && roadmap.userId.toString() !== requesterId) {
      throw makeErr("Không có quyền truy cập roadmap này", 403);
    }
  }

  private async getRoadmapForUser(
    roadmapId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<RoadmapDoc> {
    const roadmap = await this.roadmapRepository.findById(roadmapId);
    if (!roadmap) throw makeErr("Không tìm thấy roadmap", 404);
    this.assertRoadmapAccess(roadmap, requesterId, requesterRole);
    return roadmap;
  }

  private async assertTaskAccess(
    task: TaskDoc,
    requesterId: string,
    requesterRole: string,
  ): Promise<RoadmapDoc> {
    return this.getRoadmapForUser(
      task.roadmapId.toString(),
      requesterId,
      requesterRole,
    );
  }

  private async assertDocumentAccess(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền gắn document này", 403);
    }
  }

  private async recalculateProgress(roadmapId: string): Promise<PublicRoadmap> {
    const { total, completed } =
      await this.taskRepository.countByRoadmap(roadmapId);
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    const status: RoadmapStatus =
      total > 0 && completed === total ? "completed" : "in_progress";
    const roadmap = await this.roadmapRepository.update(roadmapId, {
      progress,
      status,
    });
    if (!roadmap) throw makeErr("Không tìm thấy roadmap", 404);
    return toPublicRoadmap(roadmap);
  }

  async createRoadmap(
    input: { title: string; description?: string },
    requesterId: string,
  ): Promise<PublicRoadmap> {
    const roadmap = await this.roadmapRepository.create({
      userId: requesterId,
      title: input.title,
      description: input.description,
    });
    return toPublicRoadmap(roadmap);
  }

  async listRoadmaps(requesterId: string): Promise<PublicRoadmap[]> {
    const roadmaps = await this.roadmapRepository.findByUser(requesterId);
    return roadmaps.map(toPublicRoadmap);
  }

  async getRoadmapById(
    roadmapId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<RoadmapDetail> {
    const roadmap = await this.getRoadmapForUser(
      roadmapId,
      requesterId,
      requesterRole,
    );
    const tasks = await this.taskRepository.findByRoadmap(roadmapId);
    return {
      ...toPublicRoadmap(roadmap),
      tasks: tasks.map(toPublicTask),
    };
  }

  async updateRoadmap(
    roadmapId: string,
    data: UpdateRoadmapInput,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicRoadmap> {
    await this.getRoadmapForUser(roadmapId, requesterId, requesterRole);
    const updated = await this.roadmapRepository.update(roadmapId, data);
    if (!updated) throw makeErr("Không tìm thấy roadmap", 404);
    return toPublicRoadmap(updated);
  }

  async deleteRoadmap(
    roadmapId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    await this.getRoadmapForUser(roadmapId, requesterId, requesterRole);
    await this.taskRepository.deleteByRoadmap(roadmapId);
    await this.roadmapRepository.deleteById(roadmapId);
  }

  async addTask(
    roadmapId: string,
    input: { title: string; description?: string; documentId?: string },
    requesterId: string,
    requesterRole: string,
  ): Promise<{ task: PublicTask; roadmap: PublicRoadmap }> {
    await this.getRoadmapForUser(roadmapId, requesterId, requesterRole);
    if (input.documentId) {
      await this.assertDocumentAccess(input.documentId, requesterId, requesterRole);
    }
    const task = await this.taskRepository.create({
      roadmapId,
      title: input.title,
      description: input.description,
      documentId: input.documentId,
    });
    const roadmap = await this.recalculateProgress(roadmapId);
    return { task: toPublicTask(task), roadmap };
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskInput,
    requesterId: string,
    requesterRole: string,
  ): Promise<{ task: PublicTask; roadmap: PublicRoadmap }> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw makeErr("Không tìm thấy task", 404);
    const roadmap = await this.assertTaskAccess(task, requesterId, requesterRole);
    if (data.documentId) {
      await this.assertDocumentAccess(data.documentId, requesterId, requesterRole);
    }
    if (data.isCompleted !== undefined) {
      data.completedAt = data.isCompleted ? new Date() : null;
    }
    const updated = await this.taskRepository.update(taskId, data);
    if (!updated) throw makeErr("Không tìm thấy task", 404);
    const updatedRoadmap = await this.recalculateProgress(roadmap._id.toString());
    return { task: toPublicTask(updated), roadmap: updatedRoadmap };
  }

  async deleteTask(
    taskId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicRoadmap> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw makeErr("Không tìm thấy task", 404);
    const roadmap = await this.assertTaskAccess(task, requesterId, requesterRole);
    await this.taskRepository.deleteById(taskId);
    return this.recalculateProgress(roadmap._id.toString());
  }

  async completeTask(
    taskId: string,
    isCompleted: boolean,
    requesterId: string,
    requesterRole: string,
  ): Promise<{ task: PublicTask; roadmap: PublicRoadmap }> {
    return this.updateTask(
      taskId,
      { isCompleted },
      requesterId,
      requesterRole,
    );
  }

  async attachDocumentToTask(
    taskId: string,
    documentId: string | null,
    requesterId: string,
    requesterRole: string,
  ): Promise<{ task: PublicTask; roadmap: PublicRoadmap }> {
    return this.updateTask(
      taskId,
      { documentId },
      requesterId,
      requesterRole,
    );
  }
}
