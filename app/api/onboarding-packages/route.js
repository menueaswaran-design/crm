import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { listOnboardingPackages } from "@/lib/complianceTemplates";

export async function GET(request) {
  try {
    await requirePermission(request, "clients");
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    return ok(listOnboardingPackages(category || undefined));
  } catch (error) {
    return handleError(error);
  }
}
