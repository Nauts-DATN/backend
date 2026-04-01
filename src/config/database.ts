import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri);
  return mongoose;
}
