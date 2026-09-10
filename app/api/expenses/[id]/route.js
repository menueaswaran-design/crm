import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { deleteExpense, getExpenseById, updateExpense } from "@/lib/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/utils";

export async function GET(request, { params }) {
  try {
    const user = await requirePermission(request, "dashboard");
    const { id } = await params;
    const expense = await getExpenseById(user, id);
    return ok(expense);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requirePermission(request, "dashboard");
    const { id } = await params;
    const body = await request.json();
    const { description, amount, category, date, notes } = body;

    const updates = {};
    if (description !== undefined) {
      if (!String(description).trim()) return fail("Description is required.", 400);
      updates.description = String(description).trim();
    }
    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) return fail("Amount must be a positive number.", 400);
      updates.amount = numAmount;
    }
    if (category !== undefined) {
      updates.category = EXPENSE_CATEGORIES.includes(category) ? category : "Other";
    }
    if (date !== undefined) {
      updates.date = new Date(date);
    }
    if (notes !== undefined) {
      updates.notes = String(notes || "").trim();
    }

    const expense = await updateExpense(user, id, updates);
    return ok(expense, "Expense updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requirePermission(request, "dashboard");
    const { id } = await params;
    await deleteExpense(user, id);
    return ok(null, "Expense deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
