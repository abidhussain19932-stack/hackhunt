import { defineAction, fail } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  hostOf,
  kindSchema,
  statusSchema,
  tagsToText,
  toIso,
} from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "Patch an opportunity: move it between board columns (status), or edit its title, URL, prize, deadline, fit score/reason, summary, notes, or tags. Only the fields given change.",
  schema: z.object({
    id: z.string().describe("Opportunity id"),
    title: z.string().min(1).max(200).optional(),
    url: z.string().url().nullable().optional().describe("Official page URL, or null to clear"),
    kind: kindSchema.optional(),
    status: statusSchema.optional(),
    prizeUsd: z.coerce.number().int().min(0).nullable().optional().describe("Prize pool in whole USD, or null"),
    deadlineAt: z.string().nullable().optional().describe("ISO 8601 with offset, or null to clear"),
    fitScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
    fitReason: z.string().max(400).nullable().optional(),
    summary: z.string().max(1000).nullable().optional(),
    notes: z.string().max(5000).nullable().optional().describe("User's free-form notes (markdown ok)"),
    tags: z.array(z.string()).nullable().optional(),
  }),
  run: async ({ id, ...patch }) => {
    const { opportunities: o, opportunityShares } = schema;
    const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["title", "kind", "status", "prizeUsd", "fitScore", "fitReason", "summary", "notes"] as const) {
      if (patch[key] !== undefined) set[key] = patch[key];
    }
    if (patch.url !== undefined) {
      set.url = patch.url;
      set.host = hostOf(patch.url);
    }
    if (patch.deadlineAt !== undefined) set.deadlineAt = toIso(patch.deadlineAt, "deadlineAt");
    if (patch.tags !== undefined) set.tags = tagsToText(patch.tags);
    const [row] = await getDb()
      .update(o)
      .set(set)
      .where(and(eq(o.id, id), accessFilter(o, opportunityShares, undefined, "editor")))
      .returning({ id: o.id, title: o.title, status: o.status, deadlineAt: o.deadlineAt });
    if (!row) fail("Opportunity not found or not editable.", { errorCode: "not_found", statusCode: 404 });
    return row;
  },
});
