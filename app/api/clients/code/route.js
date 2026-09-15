import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { previewNextClientSequence } from "@/lib/counter";

export async function GET(request) {
  try {
    const user = await requirePermission(request, "clients");
    const next = await previewNextClientSequence(user.companyId);
    return ok({ next });
  } catch (error) {
    return handleError(error);
  }
}