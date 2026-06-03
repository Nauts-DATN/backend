import type { Types } from "mongoose";
import { QuizModel, type IQuiz } from "../models/quiz.model.js";
import type { QuizQuestion } from "../llm/quiz.js";

export type CreateQuizInput = {
  documentId: string;
  createdBy: string;
  questionType: "multiple_choice" | "essay";
  questions: QuizQuestion[];
};

export type QuizDoc = IQuiz & { _id: Types.ObjectId };

export class QuizRepository {
  async create(data: CreateQuizInput): Promise<QuizDoc> {
    const quiz = await QuizModel.create({
      document: data.documentId,
      createdBy: data.createdBy,
      questionType: data.questionType,
      questions: data.questions,
    });
    return quiz.toObject() as QuizDoc;
  }

  async findById(id: string): Promise<QuizDoc | null> {
    const quiz = await QuizModel.findById(id).lean().exec();
    return quiz as QuizDoc | null;
  }

  async findAllByDocument(documentId: string): Promise<QuizDoc[]> {
    const quizzes = await QuizModel.find({ document: documentId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return quizzes as unknown as QuizDoc[];
  }
  async findAll(limit = 500): Promise<QuizDoc[]> {
    const quizzes = await QuizModel.find()
      .populate("document", "title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return quizzes as unknown as QuizDoc[];
  }

  async findAllByUser(userId: string): Promise<QuizDoc[]> {
    const quizzes = await QuizModel.find({ createdBy: userId })
      .populate("document", "title")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return quizzes as unknown as QuizDoc[];
  }

  async deleteById(id: string): Promise<boolean> {
    const r = await QuizModel.findByIdAndDelete(id).exec();
    return !!r;
  }

  async deleteByDocument(documentId: string): Promise<number> {
    const r = await QuizModel.deleteMany({ document: documentId }).exec();
    return r.deletedCount ?? 0;
  }
}
