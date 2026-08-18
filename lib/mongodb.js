import mongoose from "mongoose";
import { ensureAdminUser } from "@/lib/ensureAdmin";

let cached = global._mongo;

if (!cached) {
  cached = global._mongo = { conn: null, promise: null };
}

const MONGODB_URI = process.env.MONGODB_URI;

export const isDemoMode = () => {
  return false;
};

/**
 * Connects to MongoDB using a real database URI (Atlas/local).
 */
export default async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = (async () => {
      if (!MONGODB_URI) {
        throw new Error(
          "MONGODB_URI is missing. Set your MongoDB Atlas/local connection string in .env.local."
        );
      }

      await mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      });

      // Build indexes in the background so queries stay fast as data grows.
      try {
        await mongoose.connection.syncIndexes();
      } catch (e) {
        // Index sync must never block the app from starting.
        console.error("dbConnect index sync warning:", e.message);
      }

      // Bootstrap admin from ADMIN_EMAIL / ADMIN_PASSWORD (non-blocking).
      ensureAdminUser().catch(() => {});

      return mongoose;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
