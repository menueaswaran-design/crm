import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const UNASSIGNED_QUERY = {
  $or: [{ assignedStaff: null }, { assignedStaff: { $exists: false } }],
};

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "clients");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const assigned = searchParams.get("assigned") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const query = { isDeleted: { $ne: true } };
    const and = [];

    if (search) {
      and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { pan: { $regex: search, $options: "i" } },
          { gstin: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      });
    }
    if (category && category !== "All Categories") {
      query.category = category;
    }
    if (user.role === "staff") {
      query.assignedStaff = user._id;
    } else if (assigned === "unassigned") {
      and.push(UNASSIGNED_QUERY);
    } else if (assigned === "assigned") {
      query.assignedStaff = { $ne: null, $exists: true };
    }

    if (and.length) query.$and = and;

    const [clients, total] = await Promise.all([
      Client.find(query)
        .populate("assignedStaff", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Client.countDocuments(query),
    ]);

    return ok(clients, "", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "clients");

    const body = await request.json();
    if (!body.name || !body.email || !body.pan || !body.phone || !body.address) {
      return fail("Name, PAN, email, phone and address are required.");
    }

    const pan = (body.pan || "").toUpperCase();
    const gstin = (body.gstin || "").toUpperCase();
    const assignedStaff = body.assignedStaff || null;

    const existingPan = await Client.findOne({ pan, isDeleted: { $ne: true } }).lean();
    if (existingPan) return fail("A client with this PAN already exists.", 409);

    if (gstin) {
      const existingGstin = await Client.findOne({ gstin, isDeleted: { $ne: true } }).lean();
      if (existingGstin) return fail("A client with this GSTIN already exists.", 409);
    }

    const client = await Client.create({
      ...body,
      pan,
      gstin,
      assignedStaff,
      createdBy: user._id,
      status: body.status || "active",
    });

    await logActivity({
      userId: user._id,
      action: "CLIENT_CREATED",
      entityType: "Client",
      entityId: client._id,
      description: `${user.name} added ${client.name}`,
    });

    return ok(client, "Client created successfully.");
  } catch (error) {
    return handleError(error);
  }
}
