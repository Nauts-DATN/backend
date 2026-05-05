import mongoose, { Schema, type Types } from "mongoose";
import type { QuizQuestion } from "../llm/quiz.js";

export interface IQuiz {
  document: Types.ObjectId;
  createdBy: Types.ObjectId;
  questionType: "multiple_choice" | "essay";
  questions: QuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    questionType: {
      type: String,
      enum: ["multiple_choice", "essay"],
      required: true,
    },
    questions: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

export const QuizModel =
  mongoose.models.Quiz ?? mongoose.model<IQuiz>("Quiz", quizSchema);
