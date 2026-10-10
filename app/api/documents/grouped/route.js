import dbConnect from "@/lib/mongodb";
import Document from "@/models/Document";
import Client from "@/models/Client";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission, companyScope } from "@/lib/auth";
import { escapeRegex } from "@/lib/utils";

/**
 * Documents grouped by client, for the "By Client" view.
 *
 * Pagination is per client, not per file, so a client's files can never be split
 * across pages. Every file belonging to the clients on the current page is
 * returned in full so the card's "show all" expander needs no extra request.
 */
const MAX_FILES_PER_CLIENT = 200; // safety net against pathological payloads

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "documents");

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const category = searchParams.get("category") || "";
    const clientId = searchParams.get("clientId") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "8", 10), 1), 50);

    const scope = companyScope(user) || {};
    const docQuery = { isDeleted: { $ne: true }, ...scope };
    if (category && category !== "All Categories") docQuery.category = category;

    const staffClientIds =
      user.role === "staff"
        ? (await Client.find({ assignedStaff: user._id, ...scope }).select("_id").lean()).map(
            (c) => c._id
          )
        : null;

    if (clientId) {
      const reachable = staffClientIds
        ? staffClientIds.some((id) => String(id) === clientId)
        : await Client.exists({ _id: clientId, isDeleted: { $ne: true }, ...scope });
      if (!reachable) return fail("Client not found.", 404);
      docQuery.clientId = clientId;
    } else if (staffClientIds) {
      docQuery.clientId = { $in: staffClientIds };
    }

    const searchRegex = search ? new RegExp(escapeRegex(search), "i") : null;

    const stages = [
      { $match: docQuery },
      { $lookup: { from: "clients", localField: "clientId", foreignField: "_id", as: "client" } },
      { $unwind: "$client" },
      { $match: { "client.isDeleted": { $ne: true } } },
    ];

    if (searchRegex) {
      stages.push({
        $match: {
          $or: [
            { name: searchRegex },
            { "client.name": searchRegex },
            { "client.clientCode": searchRegex },
            { "client.pan": searchRegex },
            { "client.gstin": searchRegex },
          ],
        },
      });
    }

    stages.push(
      {
        $lookup: {
          from: User.collection.collectionName,
          // Client.assignedStaff is declared as [ObjectId] but legacy rows hold a
          // bare ObjectId, and $in rejects a non-array second argument. Normalise
          // here so dirty data can't take down the whole query.
          let: {
            ids: {
              $let: {
                vars: { raw: { $ifNull: ["$client.assignedStaff", []] } },
                in: { $cond: [{ $isArray: "$$raw" }, "$$raw", ["$$raw"]] },
              },
            },
          },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$ids"] } } },
            { $project: { _id: 1, name: 1, role: 1 } },
          ],
          as: "clientStaff",
        },
      },
      {
        $group: {
          _id: "$clientId",
          name: { $first: "$client.name" },
          clientCode: { $first: "$client.clientCode" },
          category: { $first: "$client.category" },
          pan: { $first: "$client.pan" },
          gstin: { $first: "$client.gstin" },
          phone: { $first: "$client.phone" },
          staff: { $first: "$clientStaff" },
          totalDocuments: { $sum: 1 },
          sizeBytes: { $sum: { $ifNull: ["$size", 0] } },
          lastUploadedAt: { $max: "$uploadedAt" },
        },
      },
      {
        $facet: {
          groups: [
            { $sort: { lastUploadedAt: -1, _id: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totals: [
            { $group: { _id: null, clients: { $sum: 1 }, files: { $sum: "$totalDocuments" } } },
          ],
        },
      }
    );

    const [result] = await Document.aggregate(stages);
    const groups = result?.groups || [];
    const totals = result?.totals?.[0] || {};
    const totalClients = totals.clients || 0;
    const totalFiles = totals.files || 0;

    if (!groups.length) {
      return ok([], "", {
        totals: { clients: 0, files: 0 },
        pagination: { page, limit, total: 0, totalPages: 1 },
      });
    }

    const clientIds = groups.map((g) => g._id);
    const rows = await Document.find({ ...docQuery, clientId: { $in: clientIds } })
      .populate("uploadedBy", "name")
      .sort({ uploadedAt: -1 })
      .lean();

    const byClient = new Map(clientIds.map((id) => [String(id), []]));
    for (const row of rows) {
      byClient.get(String(row.clientId))?.push(row);
    }

    const data = groups.map((g) => {
      const key = String(g._id);
      const all = byClient.get(key) || [];
      const documents = all.slice(0, MAX_FILES_PER_CLIENT);

      const categoryCounts = {};
      for (const doc of all) {
        const cat = doc.category || "Other";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      return {
        _id: g._id,
        name: g.name,
        clientCode: g.clientCode,
        category: g.category,
        pan: g.pan,
        gstin: g.gstin,
        phone: g.phone,
        staff: g.staff || [],
        totalDocuments: g.totalDocuments,
        truncated: all.length > MAX_FILES_PER_CLIENT,
        sizeBytes: g.sizeBytes,
        lastUploadedAt: g.lastUploadedAt,
        categoryCounts,
        documents,
      };
    });

    return ok(data, "", {
      totals: { clients: totalClients, files: totalFiles },
      pagination: {
        page,
        limit,
        total: totalClients,
        totalPages: Math.ceil(totalClients / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[documents/grouped] error:", error);
    return handleError(error);
  }
}