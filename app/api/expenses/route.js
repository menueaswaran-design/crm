import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { createExpense, getExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/utils";

export async function GET(request) {
  try {
    const user = await requirePermission(request, "dashboard");
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly";
    if (!["daily", "weekly", "monthly", "all"].includes(period)) {
      return fail("Invalid period. Use daily, weekly, monthly, or all.", 400);
    }
    const data = await getExpenses(user, period);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const user = await requirePermission(request, "dashboard");
    const body = await request.json();
    const { description, amount, category, date, notes } = body;

    if (!description || !String(description).trim()) {
      return fail("Description is required.", 400);
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return fail("Amount must be a positive number.", 400);
    }

    const expense = await createExpense(user, {
      description: String(description).trim(),
      amount: numAmount,
      category: EXPENSE_CATEGORIES.includes(category) ? category : "Other",
      date: date ? new Date(date) : new Date(),
      notes: String(notes || "").trim(),
    });

    return ok(expense, "Expense added successfully.");
  } catch (error) {
    return handleError(error);
  }
}
