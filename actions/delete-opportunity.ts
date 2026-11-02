import { defineAction, fail } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";

export default defineAction({
  description: "Delete an opportunity and its checklist from the board. Ask the user before deleting.",
  schema: z.object({ id: z.string().describe("Opportunity id") }),
  run: async ({ id }) => {
    const { opportunities: o, opportunityShares, checklistItems: c } = schema;
    return getDb().transaction(async (tx) => {
      const [row] = await tx
        .select({ id: o.id })
        .from(o)
        .where(and(eq(o.id, id), accessFilter(o, opportunityShares, undefined, "editor")))
        .limit(1);
      if (!row) fail("Opportunity not found.", { errorCode: "not_found", statusCode: 404 });
      await tx.delete(c).where(eq(c.opportunityId, id));
      await tx.delete(o).where(eq(o.id, id));
      return { id, deleted: true };
    });
  },
});
