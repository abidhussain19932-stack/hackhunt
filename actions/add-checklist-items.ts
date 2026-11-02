import { defineAction, fail } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { toIso } from "../server/lib/opportunities.js";

export default defineAction({
  description: "Append steps to an opportunity's submission checklist, in order.",
  schema: z.object({
    opportunityId: z.string().describe("Opportunity id"),
    items: z
      .array(
        z.object({
          label: z.string().min(1).max(200).describe("One concrete step"),
          dueAt: z.string().optional().describe("Optional due date-time, ISO 8601 with offset"),
        }),
      )
      .min(1)
      .max(30),
  }),
  run: async ({ opportunityId, items }, ctx) => {
    const ownerEmail = ctx?.userEmail ?? fail("Sign in first.", { statusCode: 401 });
    const { opportunities: o, opportunityShares, checklistItems: c } = schema;
    return getDb().transaction(async (tx) => {
      const [opp] = await tx
        .select({ id: o.id, orgId: o.orgId })
        .from(o)
        .where(and(eq(o.id, opportunityId), accessFilter(o, opportunityShares, undefined, "editor")))
        .for("update");
      if (!opp) fail("Opportunity not found.", { errorCode: "not_found", statusCode: 404 });
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${c.position}), -1)::int` })
        .from(c)
        .where(eq(c.opportunityId, opportunityId));
      const rows = items.map((i, n) => ({
        id: crypto.randomUUID(),
        opportunityId,
        label: i.label.trim(),
        dueAt: toIso(i.dueAt, "dueAt"),
        position: max + 1 + n,
        ownerEmail,
        orgId: opp.orgId,
      }));
      await tx.insert(c).values(rows);
      return { added: rows.map((r) => ({ id: r.id, label: r.label })) };
    });
  },
});
