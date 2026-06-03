/**
 * @deprecated Dùng trực tiếp `../db/client.js` cho code mới.
 * Giữ re-export để import cũ vẫn hoạt động.
 */
export {
  connectMongo,
  disconnectMongo,
  getMongoDb,
  isMongoConnected,
} from "../db/client.js";
