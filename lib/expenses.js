import dbConnect from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { companyScope } from "@/lib/auth";

export async function createExpense(user, data) {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");
  const expense = await Expense.create({
    ...data,
    companyId: user.companyId,
    addedBy: user._id,
  });
  return expense.toObject();
}

export async function deleteExpense(user, expenseId) {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");
  const expense = await Expense.findOneAndDelete({ _id: expenseId, ...scope });
  if (!expense) throw new Error("Expense not found.");
  return expense.toObject();
}

export async function getExpenseById(user, expenseId) {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");
  const expense = await Expense.findOne({ _id: expenseId, ...scope })
    .populate("addedBy", "name")
    .lean();
  if (!expense) throw new Error("Expense not found.");
  return expense;
}

function periodRange(period, now) {
  if (period === "all") return null;
  const start = new Date(now);
  if (period === "daily") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

export async function getExpenses(user, period = "monthly") {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");
  const from = periodRange(period, new Date());
  const filter = from ? { ...scope, date: { $gte: from } } : scope;
  const expenses = await Expense.find(filter)
    .populate("addedBy", "name")
    .sort({ date: -1 })
    .lean();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return { expenses, total };
}

export async function updateExpense(user, expenseId, data) {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");
  const expense = await Expense.findOneAndUpdate(
    { _id: expenseId, ...scope },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!expense) throw new Error("Expense not found.");
  return expense.toObject();
}

export async function getTotalExpenses(user) {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");
  const result = await Expense.aggregate([
    { $match: scope },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total || 0;
}

export async function getMonthlyExpenseSeries(user) {
  await dbConnect();
  const scope = companyScope(user);
  if (!scope) throw new Error("Invalid company scope.");

  const rows = await Expense.aggregate([
    { $match: scope },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const byMonth = new Map();
  rows.forEach((r) => {
    byMonth.set(`${r._id.year}-${String(r._id.month).padStart(2, "0")}`, r.total);
  });

  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    series.push({ name: MONTHS[d.getMonth()], expenses: byMonth.get(key) || 0 });
  }
  return series;
}
