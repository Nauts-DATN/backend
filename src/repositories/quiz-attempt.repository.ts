import type { Types } from "mongoose";
import {
  QuizAttemptModel,
  type IQuizAttempt,
  type QuizAttemptAnswer,
} from "../models/quiz-attempt.model.js";

export type CreateQuizAttemptInput = {
  quizId: string;
  userId: string;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  answers: QuizAttemptAnswer[];
};

export type QuizAttemptDoc = IQuizAttempt & { _id: Types.ObjectId };

export class QuizAttemptRepository {
  async create(data: CreateQuizAttemptInput): Promise<QuizAttemptDoc> {
    const attempt = await QuizAttemptModel.create({
      quiz: data.quizId,
      user: data.userId,
      score: data.score,
      correctCount: data.correctCount,
      totalQuestions: data.totalQuestions,
      answers: data.answers,
    });
    return attempt.toObject() as QuizAttemptDoc;
  }

  async findLatestByQuizIdsForUser(
    quizIds: string[],
    userId: string,
  ): Promise<QuizAttemptDoc[]> {
    if (quizIds.length === 0) return [];

    const attempts = await QuizAttemptModel.find({
      quiz: { $in: quizIds },
      user: userId,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const latest = new Map<string, QuizAttemptDoc>();
    for (const attempt of attempts as unknown as QuizAttemptDoc[]) {
      const quizId = attempt.quiz.toString();
      if (!latest.has(quizId)) {
        latest.set(quizId, attempt);
      }
    }

    return [...latest.values()];
  }

  async deleteByQuiz(quizId: string): Promise<number> {
    const r = await QuizAttemptModel.deleteMany({ quiz: quizId }).exec();
    return r.deletedCount ?? 0;
  }

  async deleteByQuizIds(quizIds: string[]): Promise<number> {
    if (quizIds.length === 0) return 0;
    const r = await QuizAttemptModel.deleteMany({
      quiz: { $in: quizIds },
    }).exec();
    return r.deletedCount ?? 0;
  }
}
