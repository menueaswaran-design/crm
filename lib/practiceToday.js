/**
 * Practice owner "Today" action feed — overdue filings, unpaid invoices, unassigned clients.
 */

import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import Compliance from "@/models/Compliance";
import Invoice from "@/models/Invoice";
import { companyScope } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { refreshOverdueCompliance, startOfToday } from "@/lib/status";

async function staffClientIds(user, scope) {
  if (user.role === "admin") return null;
  const clients = await Client.find({ assignedStaff: user._id, ...scope }).select("_id").lean();
  return clients.map((c) => c._id);
}

export async function getPracticeToday(user) {
  await dbConnect();
  await refreshOverdueCompliance();

  const scope = companyScope(user) || {};
  const isAdmin = user.role === "admin";
  const clientIds = await staffClientIds(user, scope);
  const today = startOfToday();

  const complianceFilter = {
    ...scope,
    status: { $ne: "COMPLETED" },
    dueDate: { $lt: today },
  };
  if (!isAdmin) {
    complianceFilter.assignedStaff = user._id;
  }

  const invoiceFilter = {
    isDeleted: { $ne: true },
    ...scope,
    outstandingAmount: { $gt: 0 },
    status: { $in: ["PENDING", "PARTIAL", "OVERDUE"] },
  };
  if (!isAdmin && clientIds) {
    invoiceFilter.clientId = { $in: clientIds };
  }

  const unassignedFilter = {
    isDeleted: { $ne: true },
    ...scope,
    $or: [{ assignedStaff: null }, { assignedStaff: { $exists: false } }],
  };

  const canCompliance = hasPermission(user, "compliance");
  const canInvoices = hasPermission(user, "invoices");
  const canClients = hasPermission(user, "clients") && isAdmin;

  const [overdueFilings, unpaidInvoices, unassignedClients, counts] = await Promise.all([
    canCompliance
      ? Compliance.find(complianceFilter)
          .populate("clientId", "name phone pan gstin category")
          .populate("assignedStaff", "name")
          .sort({ dueDate: 1 })
          .limit(25)
          .lean()
      : Promise.resolve([]),
    canInvoices
      ? Invoice.find(invoiceFilter)
          .populate("clientId", "name phone pan category")
          .sort({ dueDate: 1 })
          .limit(25)
          .lean()
      : Promise.resolve([]),
    canClients
      ? Client.find(unassignedFilter)
          .select("name phone pan gstin category clientCode createdAt")
          .sort({ createdAt: -1 })
          .limit(25)
          .lean()
      : Promise.resolve([]),
    Promise.all([
      canCompliance ? Compliance.countDocuments(complianceFilter) : 0,
      canInvoices ? Invoice.countDocuments(invoiceFilter) : 0,
      canClients ? Client.countDocuments(unassignedFilter) : 0,
    ]),
  ]);

  const [overdueCount, unpaidCount, unassignedCount] = counts;

  return {
    counts: {
      overdueFilings: overdueCount,
      unpaidInvoices: unpaidCount,
      unassignedClients: unassignedCount,
      actionItems: overdueCount + unpaidCount + (isAdmin ? unassignedCount : 0),
    },
    overdueFilings: overdueFilings.map((r) => ({
      id: r._id,
      type: r.type,
      category: r.category,
      period: r.period,
      dueDate: r.dueDate,
      status: r.status,
      priority: r.priority,
      client: r.clientId
        ? {
            _id: r.clientId._id,
            name: r.clientId.name,
            phone: r.clientId.phone,
          }
        : null,
      assignedStaff: r.assignedStaff?.name || null,
    })),
    unpaidInvoices: unpaidInvoices.map((inv) => ({
      id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      outstandingAmount: inv.outstandingAmount,
      status: inv.status,
      client: inv.clientId
        ? {
            _id: inv.clientId._id,
            name: inv.clientId.name,
            phone: inv.clientId.phone,
          }
        : null,
    })),
    unassignedClients: unassignedClients.map((c) => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      pan: c.pan,
      gstin: c.gstin,
      category: c.category,
      clientCode: c.clientCode,
      createdAt: c.createdAt,
    })),
  };
}
