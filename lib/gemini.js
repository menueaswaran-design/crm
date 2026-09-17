/**
 * Gemini AI helpers for document analysis (PDF / images).
 * Requires GEMINI_API_KEY in the environment.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getModel() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured. Add it to .env.local.");
  }
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
}

const ANALYSIS_PROMPT = `You are an expert Indian CA / tax assistant analyzing a client notice or official document.

Extract structured data from this document. Return ONLY valid JSON with this exact shape:
{
  "documentType": "string — e.g. GST Notice, Income Tax Notice, ROC Notice, TDS Notice, Bank Statement, Invoice, Other",
  "category": "GST | Income Tax | TDS | ROC | PF | ESI | Other",
  "clientName": "string — company or person name mentioned, or empty string",
  "pan": "string — PAN if present, else empty",
  "gstin": "string — GSTIN if present, else empty",
  "importantDate": "YYYY-MM-DD — reply / hearing / due date if any, else null",
  "amount": number or null — monetary amount if clearly stated (INR, no currency symbol),
  "actionRequired": "string — concise next action for the CA firm",
  "summary": "string — 2-4 sentence plain-English summary",
  "complianceType": "GSTR-1 | GSTR-3B | GSTR-9 | GSTR-9C | TDS Return | ITR | Advance Tax | ROC Filing | PF | ESI | Other",
  "priority": "LOW | MEDIUM | HIGH",
  "suggestedTitle": "string — short task/compliance title"
}

Rules:
- Prefer Indian formats (PAN, GSTIN, INR).
- If a field is unknown, use "" or null as specified.
- Do not invent amounts or dates.
- importantDate must be ISO YYYY-MM-DD or null.
- amount must be a number (e.g. 45000) or null.`;

function stripCodeFences(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeAnalysis(raw) {
  const data = typeof raw === "string" ? JSON.parse(stripCodeFences(raw)) : raw;

  const amount =
    data.amount === null || data.amount === undefined || data.amount === ""
      ? null
      : Number(String(data.amount).replace(/[₹,\s]/g, ""));

  let importantDate = data.importantDate || null;
  if (importantDate) {
    const d = new Date(importantDate);
    importantDate = Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const priority = ["LOW", "MEDIUM", "HIGH"].includes(String(data.priority || "").toUpperCase())
    ? String(data.priority).toUpperCase()
    : "MEDIUM";

  return {
    documentType: String(data.documentType || "Other").trim(),
    category: String(data.category || "Other").trim(),
    clientName: String(data.clientName || "").trim(),
    pan: String(data.pan || "").trim().toUpperCase(),
    gstin: String(data.gstin || "").trim().toUpperCase(),
    importantDate,
    amount: Number.isFinite(amount) ? amount : null,
    actionRequired: String(data.actionRequired || "").trim(),
    summary: String(data.summary || "").trim(),
    complianceType: String(data.complianceType || "Other").trim(),
    priority,
    suggestedTitle: String(data.suggestedTitle || data.documentType || "Document follow-up").trim(),
  };
}

/**
 * Analyze a document buffer with Gemini multimodal input.
 * @param {{ buffer: Buffer, mimeType: string, fileName?: string }} file
 */
export async function analyzeDocumentWithGemini({ buffer, mimeType, fileName }) {
  const model = getModel();
  const base64 = Buffer.from(buffer).toString("base64");

  const parts = [{ text: ANALYSIS_PROMPT }];
  if (fileName) parts.push({ text: `File name: ${fileName}` });
  parts.push({
    inlineData: {
      mimeType: mimeType || "application/pdf",
      data: base64,
    },
  });

  let result;
  try {
    result = await model.generateContent(parts);
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes("API key") || msg.includes("API_KEY") || msg.includes("401") || msg.includes("403")) {
      throw new Error("Invalid or unauthorized Gemini API key. Check GEMINI_API_KEY in .env.local.");
    }
    if (msg.includes("404") || msg.includes("no longer available") || msg.includes("not found")) {
      throw new Error(
        `Gemini model "${MODEL}" is unavailable. Set GEMINI_MODEL in .env.local (e.g. gemini-3.6-flash) and restart.`
      );
    }
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      throw new Error("Gemini quota exceeded. Try again later or check your Google AI Studio plan.");
    }
    throw new Error(msg.replace(/^\[GoogleGenerativeAI Error\]:\s*/i, "").slice(0, 280) || "Gemini request failed.");
  }

  const text = result.response?.text?.() || "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response. Try another document.");
  }

  try {
    return normalizeAnalysis(text);
  } catch {
    throw new Error("Could not parse AI response. Please try again.");
  }
}
