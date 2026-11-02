import { defineAction, fail } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { toIso } from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "Tick or untick a checklist step, rename it, change its due date, or remove it (remove: true).",
  schema: z.object({
    id: z.string().describe("Checklist item id"),
    done: z.boolean().optional(),
    label: z.string().min(1).max(200).optional(),
    dueAt: z.string().nullable().optional().describe("ISO 8601 with offset, or null to clear"),
    remove: z.boolean().optional().describe("true deletes the step"),
  }),
  run: async ({ id, done, label, dueAt, remove }) => {
    const { opportunities: o, opportunityShares, checklistItems: c } = schema;
    const db = getDb();
    const [item] = await db
      .select({ id: c.id, opportunityId: c.opportunityId })
      .from(c)
      .innerJoin(o, eq(o.id, c.opportunityId))
      .where(and(eq(c.id, id), accessFilter(o, opportunityShares, undefined, "editor")))
      .limit(1);
    if (!item) fail("Checklist item not found.", { errorCode: "not_found", statusCode: 404 });
    if (remove) {
      await db.delete(c).where(eq(c.id, id));
      return { id, removed: true };
    }
    const set: Record<string, unknown> = {};
    if (done !== undefined) set.done = done;
    if (label !== undefined) set.label = label.trim();
    if (dueAt !== undefined) set.dueAt = toIso(dueAt, "dueAt");
    if (Object.keys(set).length === 0) fail("Nothing to change.", { errorCode: "empty_patch" });
    const [row] = await db
      .update(c)
      .set(set)
      .where(eq(c.id, id))
      .returning({ id: c.id, label: c.label, done: c.done, dueAt: c.dueAt });
    await db.update(o).set({ updatedAt: new Date().toISOString() }).where(eq(o.id, item.opportunityId));
    return row;
  },
});
