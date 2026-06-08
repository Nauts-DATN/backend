import mongoose, { Schema, type Types } from "mongoose";

export type QuizAttemptAnswer = {
  questionId: string;
  selectedOption?: number;
  text?: string;
  isCorrect?: boolean;
};

export interface IQuizAttempt {
  quiz: Types.ObjectId;
  user: Types.ObjectId;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  answers: QuizAttemptAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    correctCount: {
      type: Number,
      default: null,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    answers: {
      type: Schema.Types.Mixed,
      default: [],
    },
  },
  { timestamps: true },
);

quizAttemptSchema.index({ quiz: 1, user: 1, createdAt: -1 });

export const QuizAttemptModel =
  mongoose.models.QuizAttempt ??
  mongoose.model<IQuizAttempt>("QuizAttempt", quizAttemptSchema);
