import { defineAction, fail } from "@agent-native/core/action";
import { buildDeepLink } from "@agent-native/core/server";
import { accessFilter } from "@agent-native/core/sharing";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  hostOf,
  kindSchema,
  statusSchema,
  tagsToText,
  toIso,
} from "../server/lib/opportunities.js";

const item = z.object({
  title: z.string().min(1).max(200).describe("Opportunity name, e.g. 'Agent-Native Hackathon'"),
  url: z.string().url().optional().describe("Official page URL (rules or listing)"),
  kind: kindSchema.default("hackathon"),
  status: statusSchema.default("scouted"),
  prizeUsd: z.coerce.number().int().min(0).optional().describe("Total prize pool in whole US dollars"),
  deadlineAt: z
    .string()
    .optional()
    .describe("Submission deadline, ISO 8601 with the organizer's offset, e.g. 2026-11-09T23:59:00-08:00"),
  fitScore: z.coerce.number().int().min(0).max(100).optional().describe("0-100: how well it fits the user's skills and time"),
  fitReason: z.string().max(400).optional().describe("One or two sentences explaining the fit score"),
  summary: z.string().max(1000).optional().describe("What to build/submit and key requirements"),
  tags: z.array(z.string()).optional().describe("Short lowercase tags, e.g. ['ai','python','solo-ok']"),
  checklist: z
    .array(
      z.object({
        label: z.string().min(1).max(200).describe("One concrete step, e.g. 'Record public Clips demo'"),
        dueAt: z.string().optional().describe("Optional step due date-time, ISO 8601 with offset"),
      }),
    )
    .max(30)
    .optional()
    .describe("Submission checklist derived from the rules"),
});

export default defineAction({
  description:
    "Add one or more opportunities to the board in one transaction, each with an optional submission checklist. Skips any whose URL is already on the board and reports them as duplicates.",
  schema: z.object({ items: z.array(item).min(1).max(25) }),
  link: () => ({ url: buildDeepLink({ view: "board", to: "/board" }), label: "Open board" }),
  run: async ({ items }, ctx) => {
    const ownerEmail = ctx?.userEmail ?? fail("Sign in first.", { statusCode: 401 });
    const orgId = ctx?.orgId ?? null;
    const { opportunities: o, opportunityShares, checklistItems: c } = schema;
    const db = getDb();
    const urls = items.map((i) => i.url).filter((u): u is string => Boolean(u));
    const existing = urls.length
      ? await db
          .select({ id: o.id, url: o.url, title: o.title })
          .from(o)
          .where(and(inArray(o.url, urls), accessFilter(o, opportunityShares)))
      : [];
    const seen = new Set(existing.map((e) => e.url));
    const created: { id: string; title: string }[] = [];
    await db.transaction(async (tx) => {
      for (const i of items) {
        if (i.url && seen.has(i.url)) continue;
        if (i.url) seen.add(i.url);
        const id = crypto.randomUUID();
        await tx.insert(o).values({
          id,
          title: i.title.trim(),
          url: i.url ?? null,
          host: hostOf(i.url),
          kind: i.kind,
          status: i.status,
          prizeUsd: i.prizeUsd ?? null,
          deadlineAt: toIso(i.deadlineAt, "deadlineAt"),
          fitScore: i.fitScore ?? null,
          fitReason: i.fitReason ?? null,
          summary: i.summary ?? null,
          tags: tagsToText(i.tags),
          ownerEmail,
          orgId,
          visibility: orgId ? "org" : "private",
        });
        if (i.checklist?.length) {
          await tx.insert(c).values(
            i.checklist.map((step, position) => ({
              id: crypto.randomUUID(),
              opportunityId: id,
              label: step.label.trim(),
              dueAt: toIso(step.dueAt, "checklist.dueAt"),
              position,
              ownerEmail,
              orgId,
            })),
          );
        }
        created.push({ id, title: i.title });
      }
    });
    return {
      created,
      duplicates: existing.map((e) => ({ id: e.id, title: e.title, url: e.url })),
    };
  },
});
