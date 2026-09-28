/**
 * One-shot migration: Client.assignedStaff changed from a single User id to an
 * array of User ids. Wraps existing single ids and normalises null/missing rows.
 *
 * Idempotent — safe to re-run.
 * Usage: node --env-file=.env.local scripts/migrate-client-staff.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

try {
  require("dotenv").config({ path: path.join(root, ".env.local") });
} catch {
  // ignore
}

async function main() {
  const mongoose = (await import("mongoose")).default;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);

  // Raw collection access so the old single-id shape is not run through the
  // new array-typed schema, which would reject it.
  const clients = mongoose.connection.db.collection("clients");

  // `$type: "objectId"` also matches an *array* of ObjectIds, so guard on the
  // field not being an array too — otherwise a second run would nest the arrays.
  const isScalarObjectId = {
    $and: [{ assignedStaff: { $type: "objectId" } }, { assignedStaff: { $not: { $type: "array" } } }],
  };

  const single = await clients.find(isScalarObjectId, { projection: { assignedStaff: 1 } }).toArray();

  if (single.length) {
    await clients.bulkWrite(
      single.map((c) => ({
        updateOne: {
          filter: { _id: c._id, ...isScalarObjectId },
          update: { $set: { assignedStaff: [c.assignedStaff] } },
        },
      }))
    );
  }
  console.log(`Wrapped ${single.length} single assignment(s) into an array.`);

  // Matches both an explicit null and a missing field; empty arrays are skipped.
  const empty = await clients.updateMany(
    { $or: [{ assignedStaff: null }, { assignedStaff: { $exists: false } }] },
    { $set: { assignedStaff: [] } }
  );
  console.log(`Normalised ${empty.modifiedCount} unassigned client(s) to an empty array.`);

  const invalid = await clients.countDocuments({ assignedStaff: { $not: { $type: "array" } } });
  if (invalid) {
    console.warn(`Warning: ${invalid} client(s) still hold a non-array assignedStaff value.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
