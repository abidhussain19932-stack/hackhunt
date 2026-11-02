import { defineAction, fail } from "@agent-native/core/action";
import { buildDeepLink } from "@agent-native/core/server";
import { accessFilter } from "@agent-native/core/sharing";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { tagsFromText } from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "Get one opportunity with its notes and full submission checklist (in order).",
  schema: z.object({ id: z.string().describe("Opportunity id from list-opportunities") }),
  http: { method: "GET" },
  readOnly: true,
  link: ({ args }) => ({
    url: buildDeepLink({
      view: "board",
      to: `/board/${encodeURIComponent(args.id)}`,
      params: { opportunityId: args.id },
    }),
    label: "Open opportunity",
  }),
  run: async ({ id }) => {
    const { opportunities: o, opportunityShares, checklistItems: c } = schema;
    const db = getDb();
    const [row] = await db
      .select()
      .from(o)
      .where(and(eq(o.id, id), accessFilter(o, opportunityShares)))
      .limit(1);
    if (!row) fail("Opportunity not found.", { errorCode: "not_found", statusCode: 404 });
    const checklist = await db
      .select({
        id: c.id,
        label: c.label,
        done: c.done,
        dueAt: c.dueAt,
        position: c.position,
      })
      .from(c)
      .where(eq(c.opportunityId, id))
      .orderBy(asc(c.position), asc(c.createdAt))
      .limit(200);
    return {
      now: new Date().toISOString(),
      opportunity: {
        id: row.id,
        title: row.title,
        url: row.url,
        host: row.host,
        kind: row.kind,
        status: row.status,
        prizeUsd: row.prizeUsd,
        deadlineAt: row.deadlineAt,
        fitScore: row.fitScore,
        fitReason: row.fitReason,
        summary: row.summary,
        notes: row.notes,
        tags: tagsFromText(row.tags),
        updatedAt: row.updatedAt,
      },
      checklist,
    };
  },
});
