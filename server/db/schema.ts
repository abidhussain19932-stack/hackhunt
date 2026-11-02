import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import {
  createSharesTable,
  ownableColumns,
} from "@agent-native/core/db/schema";

// An opportunity is a hackathon, bounty, grant, or contest the user is
// tracking. Times are normalized UTC ISO text so string order equals time order.
export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url"),
  host: text("host"),
  kind: text("kind", {
    enum: ["hackathon", "bounty", "grant", "contest", "other"],
  })
    .notNull()
    .default("hackathon"),
  status: text("status", {
    enum: ["scouted", "shortlisted", "building", "submitted", "won", "passed"],
  })
    .notNull()
    .default("scouted"),
  prizeUsd: integer("prize_usd"),
  deadlineAt: text("deadline_at"),
  fitScore: integer("fit_score"),
  fitReason: text("fit_reason"),
  summary: text("summary"),
  notes: text("notes"),
  tags: text("tags"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
  ...ownableColumns(),
});
export const opportunityShares = createSharesTable("opportunity_shares");

// Checklist steps inherit their opportunity's access.
export const checklistItems = pgTable("checklist_items", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  label: text("label").notNull(),
  done: boolean("done").notNull().default(false),
  dueAt: text("due_at"),
  position: integer("position").notNull().default(0),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});
