import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { previewNextClientSequence } from "@/lib/counter";

export async function GET(request) {
  try {
    await requirePermission(request, "clients");
    const next = await previewNextClientSequence();
    return ok({ next });
  } catch (error) {
    return handleError(error);
  }
}