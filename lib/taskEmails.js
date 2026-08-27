import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendEmail, getSmtpConfig, isSmtpConfigured } from "@/lib/smtp";

/**
 * Emails the assigned staff member when a task is assigned to them.
 * Silently no-ops when SMTP isn't configured/enabled, so the CRM still works
 * without email. In-app notifications are handled separately by callers.
 */
export async function sendTaskAssignedEmail({ taskTitle, clientName, dueDate, priority, assignedBy, assignedToId }) {
  try {
    if (!assignedToId) return;
    await dbConnect();

    const assignee = await User.findById(assignedToId).select("name email").lean();
    if (!assignee?.email) return;

    const cfg = await getSmtpConfig();
    if (!isSmtpConfigured(cfg)) return;

    const asignedOn = new Date().toLocaleDateString("en-IN");
    const due = dueDate ? new Date(dueDate).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "";

    const text = [
      "A new task has been assigned to you.",
      "",
      `Task: ${taskTitle}`,
      clientName ? `Client: ${clientName}` : "",
      due ? `Due date: ${due}` : "",
      priority ? `Priority: ${priority}` : "",
      assignedBy ? `Assigned by: ${assignedBy}` : "",
      "",
      "Open the CA Office CRM to view the full task details.",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="display: inline-block; background: #eef2ff; color: #4f46e5; border-radius: 8px; padding: 8px 14px; font-weight: 600;">CA Office CRM</div>
        <h2 style="margin: 20px 0 8px; color: #0f172a;">A new task has been assigned to you</h2>
        <p style="color: #475569; margin: 0 0 20px;">Assigned on ${asignedOn}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b;">Task</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${taskTitle}</td></tr>
          ${clientName ? `<tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${clientName}</td></tr>` : ""}
          ${due ? `<tr><td style="padding: 8px 0; color: #64748b;">Due date</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${due}</td></tr>` : ""}
          ${priority ? `<tr><td style="padding: 8px 0; color: #64748b;">Priority</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${priority.charAt(0) + priority.slice(1).toLowerCase()}</td></tr>` : ""}
          ${assignedBy ? `<tr><td style="padding: 8px 0; color: #64748b;">Assigned by</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${assignedBy}</td></tr>` : ""}
        </table>
        <div style="margin-top: 24px; padding: 14px 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #475569;">
          Open the CA Office CRM to view the full task details and update its status.
        </div>
      </div>
    `;

    await sendEmail({
      to: assignee.email,
      subject: `New task assigned: ${taskTitle}`,
      text,
      html,
    });
  } catch (error) {
    // Email is best-effort — never break the task creation/update flow.
    console.error("sendTaskAssignedEmail failed:", error.message);
  }
}