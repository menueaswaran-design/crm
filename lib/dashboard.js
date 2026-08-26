import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import Compliance from "@/models/Compliance";
import Task from "@/models/Task";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import Document from "@/models/Document";
import Activity from "@/models/Activity";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function staffClientIds(user) {
  if (user.role === "admin") return null;
  const clients = await Client.find({ assignedStaff: user._id }).select("_id").lean();
  return clients.map((c) => c._id);
}

function statusBucket(collection, match, today) {
  return collection.aggregate([
    { $match: match },
    {
      $addFields: {
        derivedStatus: {
          $cond: [
            { $and: [{ $ne: ["$status", "COMPLETED"] }, { $lt: ["$dueDate", today] }] },
            "OVERDUE",
            "$status",
          ],
        },
      },
    },
    { $group: { _id: "$derivedStatus", count: { $sum: 1 } } },
  ]);
}

function emptyCounts(defaults) {
  return { ...defaults };
}

export async function getDashboardSummary(user) {
  await dbConnect();

  const isAdmin = user.role === "admin";
  const clientIds = await staffClientIds(user);
  const today = new Date();

  const clientFilter = isAdmin ? {} : { assignedStaff: user._id };
  const invoiceFilter = isAdmin ? {} : clientIds ? { clientId: { $in: clientIds } } : {};
  const paymentFilter = isAdmin ? {} : clientIds ? { clientId: { $in: clientIds } } : {};

  const [totalClients, complianceBuckets, taskBuckets, invoiceSums, paymentSums, documents] =
    await Promise.all([
      Client.countDocuments({ isDeleted: { $ne: true }, ...clientFilter }),
      statusBucket(Compliance, clientFilter, today),
      statusBucket(
        Task,
        { isDeleted: { $ne: true }, ...clientFilter },
        today
      ),
      Invoice.aggregate([
        { $match: { isDeleted: { $ne: true }, ...invoiceFilter } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Payment.aggregate([
        { $match: paymentFilter },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Document.countDocuments({ isDeleted: { $ne: true } }),
    ]);

  const complianceByStatus = emptyCounts({ PENDING: 0, IN_PROGRESS: 0, OVERDUE: 0, COMPLETED: 0 });
  complianceBuckets.forEach((b) => {
    if (b._id) complianceByStatus[b._id] = b.count;
  });

  const tasksByStatus = emptyCounts({ PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, OVERDUE: 0 });
  taskBuckets.forEach((b) => {
    if (b._id) tasksByStatus[b._id] = b.count;
  });

  const totalRevenue = invoiceSums[0]?.total || 0;
  const amountReceived = paymentSums[0]?.total || 0;
  const outstandingAmount = Math.max(0, totalRevenue - amountReceived);

  return {
    totalClients,
    activeClients: totalClients,
    compliance: complianceByStatus,
    tasks: tasksByStatus,
    totalRevenue,
    amountReceived,
    outstandingAmount,
    documents,
  };
}

export async function getRevenueSeries(user) {
  await dbConnect();

  const clientIds = await staffClientIds(user);
  const filter = clientIds ? { clientId: { $in: clientIds } } : {};

  const rows = await Invoice.aggregate([
    { $match: { isDeleted: { $ne: true }, ...filter } },
    {
      $group: {
        _id: {
          year: { $year: "$invoiceDate" },
          month: { $month: "$invoiceDate" },
        },
        total: { $sum: "$totalAmount" },
      },
    },
  ]);

  const byMonth = new Map();
  rows.forEach((r) => {
    byMonth.set(`${r._id.year}-${String(r._id.month).padStart(2, "0")}`, r.total);
  });

  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    series.push({ name: MONTHS[d.getMonth()], revenue: byMonth.get(key) || 0 });
  }
  return series;
}

export async function getRecentActivity(user) {
  await dbConnect();
  const activities = await Activity.find({})
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return activities.map((a) => ({
    id: String(a._id),
    action: a.action,
    description: a.description || a.action,
    actor: a.userId?.name || "System",
    createdAt: a.createdAt,
  }));
}

export async function getUpcomingDeadlines(user) {
  await dbConnect();
  const isAdmin = user.role === "admin";
  const today = new Date();
  const staffQuery = isAdmin ? {} : { assignedStaff: user._id };

  const [compliance, tasks] = await Promise.all([
    Compliance.find({ ...staffQuery, status: { $ne: "COMPLETED" } })
      .populate("clientId", "name")
      .populate("assignedStaff", "name")
      .sort({ dueDate: 1 })
      .limit(30)
      .lean(),
    Task.find({ ...staffQuery, status: { $ne: "COMPLETED" }, isDeleted: { $ne: true } })
      .populate("clientId", "name")
      .populate("assignedTo", "name")
      .sort({ dueDate: 1 })
      .limit(30)
      .lean(),
  ]);

  const items = [
    ...compliance.map((c) => ({
      id: String(c._id),
      type: "Compliance",
      label: c.type,
      client: c.clientId?.name || "—",
      dueDate: c.dueDate,
      daysLeft: Math.round((new Date(c.dueDate) - today) / (1000 * 60 * 60 * 24)),
      assignedTo: c.assignedStaff?.name || "—",
    })),
    ...tasks.map((t) => ({
      id: String(t._id),
      type: "Task",
      label: t.title,
      client: t.clientId?.name || "—",
      dueDate: t.dueDate,
      daysLeft: t.dueDate ? Math.round((new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24)) : null,
      assignedTo: t.assignedTo?.name || "—",
    })),
  ];

  return items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}
