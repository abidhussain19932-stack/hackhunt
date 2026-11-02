import { defineAction } from "@agent-native/core/action";
import { buildDeepLink } from "@agent-native/core/server";
import { accessFilter } from "@agent-native/core/sharing";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { statusSchema, tagsFromText } from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "List tracked opportunities (hackathons, bounties, grants, contests) on the board, soonest deadline first, with checklist progress. Optionally filter by status.",
  schema: z.object({
    status: statusSchema.optional().describe("Only this board column; omit for all"),
  }),
  http: { method: "GET" },
  readOnly: true,
  link: () => ({
    url: buildDeepLink({ view: "board", to: "/board" }),
    label: "Open board",
  }),
  run: async ({ status }) => {
    const { opportunities: o, opportunityShares, checklistItems: c } = schema;
    const db = getDb();
    const rows = await db
      .select({
        id: o.id,
        title: o.title,
        url: o.url,
        host: o.host,
        kind: o.kind,
        status: o.status,
        prizeUsd: o.prizeUsd,
        deadlineAt: o.deadlineAt,
        fitScore: o.fitScore,
        fitReason: o.fitReason,
        summary: o.summary,
        tags: o.tags,
        updatedAt: o.updatedAt,
      })
      .from(o)
      .where(
        and(
          accessFilter(o, opportunityShares),
          status ? eq(o.status, status) : undefined,
        ),
      )
      .orderBy(sql`${o.deadlineAt} IS NULL`, asc(o.deadlineAt))
      .limit(300);
    const ids = rows.map((r) => r.id);
    const progress = ids.length
      ? await db
          .select({
            opportunityId: c.opportunityId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) FILTER (WHERE ${c.done})::int`,
          })
          .from(c)
          .where(inArray(c.opportunityId, ids))
          .groupBy(c.opportunityId)
      : [];
    const byId = new Map(progress.map((p) => [p.opportunityId, p]));
    return {
      now: new Date().toISOString(),
      opportunities: rows.map((r) => ({
        ...r,
        tags: tagsFromText(r.tags),
        checklistTotal: byId.get(r.id)?.total ?? 0,
        checklistDone: byId.get(r.id)?.done ?? 0,
      })),
    };
  },
});
