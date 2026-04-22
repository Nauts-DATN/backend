import mongoose from "mongoose";
import { env } from "../config/env.js";

let connected = false;

/**
 * Kết nối MongoDB (singleton). Gọi lại nếu đã nối thì trả về ngay.
 */
export async function connectMongo(): Promise<typeof mongoose> {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri);
  connected = true;
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connected = false;
}

/** Native driver (aggregate thô, v.v.) */
export function getMongoDb() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB chưa kết nối");
  }
  return db;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
