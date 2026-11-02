import { fail } from "@agent-native/core/action";
import { z } from "zod";

export const KINDS = ["hackathon", "bounty", "grant", "contest", "other"] as const;
export const STATUSES = [
  "scouted",
  "shortlisted",
  "building",
  "submitted",
  "won",
  "passed",
] as const;

export const kindSchema = z
  .enum(KINDS)
  .describe("Type of opportunity: hackathon, bounty, grant, contest, other");
export const statusSchema = z
  .enum(STATUSES)
  .describe(
    "Board column: scouted (found), shortlisted (worth doing), building, submitted, won, passed (skipped)",
  );

/** Normalize an ISO 8601 date-time with offset (or a bare date) to UTC ISO. */
export function toIso(value: string | null | undefined, field: string) {
  if (value == null || value === "") return null;
  const v = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:00Z` : value;
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(v)) {
    fail(`${field} must be ISO 8601 with a UTC offset, e.g. 2026-11-09T23:59:00-08:00.`, {
      errorCode: "invalid_time",
    });
  }
  const ms = Date.parse(v);
  if (Number.isNaN(ms))
    fail(`${field} is not a valid date-time.`, { errorCode: "invalid_time" });
  return new Date(ms).toISOString();
}

export function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function tagsToText(tags?: string[] | null) {
  if (!tags || tags.length === 0) return null;
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12)
    .join(",");
}

export function tagsFromText(text: string | null) {
  return text ? text.split(",").filter(Boolean) : [];
}
