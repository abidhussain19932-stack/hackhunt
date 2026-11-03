import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconChevronLeft, IconChevronRight, IconClock, IconExternalLink, IconTrophy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { COLUMNS, fitClass, localDeadline, money, TONE_CLASS, timeLeft, type Status } from "@/lib/opportunity-format";
import { cn } from "@/lib/utils";

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function BoardRoute() {
  const now = useNow();
  const { data, isPending } = useActionQuery("list-opportunities", {});
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const move = useActionMutation("update-opportunity", {
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not move card"),
  });
  const add = useActionMutation("save-opportunities", {
    onSuccess: (r) => {
      setTitle("");
      setUrl("");
      if (r.duplicates.length) toast.message("Already on your board");
      else toast.success("Added. Ask the agent to read the rules and build its checklist.");
    },
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not add"),
  });

  const opps = data?.opportunities ?? [];
  const open = opps.filter((o) => !["won", "passed", "submitted"].includes(o.status));
  const next = open.find((o) => o.deadlineAt && Date.parse(o.deadlineAt) > now);
  const pool = open.reduce((s, o) => s + (o.prizeUsd ?? 0), 0);

  function shift(id: string, status: string, dir: -1 | 1) {
    const i = COLUMNS.findIndex((c) => c.id === status);
    const target = COLUMNS[i + dir];
    if (target) move.mutate({ id, status: target.id as Status });
  }

  return (
    <main className="flex min-h-full flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Opportunity board</h1>
          <p className="text-sm text-muted-foreground">
            The agent scouts, scores, and builds checklists. You decide what to chase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg border border-border bg-card px-3 py-1.5">
            <strong>{open.length}</strong> active
          </span>
          <span className="rounded-lg border border-border bg-card px-3 py-1.5">
            <strong>{money(pool) ?? "$0"}</strong> in play
          </span>
          {next ? (
            <Link to={`/board/${next.id}`} className={cn("rounded-lg px-3 py-1.5", TONE_CLASS[timeLeft(next.deadlineAt, now).tone])}>
              Next: {next.title} · {timeLeft(next.deadlineAt, now).label}
            </Link>
          ) : null}
        </div>
      </header>

      <form
        className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add.mutate({ items: [{ title: title.trim(), ...(url.trim() ? { url: url.trim() } : {}) }] as any });
        }}
      >
        <Input className="min-w-48 flex-1" placeholder="Hackathon or bounty name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input className="min-w-64 flex-[2]" placeholder="https://… (rules or listing page)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="submit" disabled={!title.trim() || add.isPending}>
          {add.isPending ? "Adding…" : "Add"}
        </Button>
      </form>

      {isPending ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((c) => (
            <Skeleton key={c.id} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((col) => {
            const cards = opps.filter((o) => o.status === col.id);
            return (
              <section key={col.id} className="flex min-h-40 flex-col rounded-xl border border-border bg-muted/30 p-2">
                <h2 className="flex items-baseline justify-between px-1 pb-2 text-sm font-medium">
                  <span>{col.label}</span>
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {cards.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">{col.hint}</p>
                  ) : null}
                  {cards.map((o) => {
                    const tl = timeLeft(o.deadlineAt, now);
                    const pct = o.checklistTotal ? Math.round((o.checklistDone / o.checklistTotal) * 100) : 0;
                    return (
                      <article key={o.id} className="group rounded-lg border border-border bg-card p-2.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/board/${o.id}`} className="min-w-0 text-sm font-medium leading-snug hover:underline">
                            {o.title}
                          </Link>
                          {o.fitScore != null ? (
                            <span title={o.fitReason ?? undefined} className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold", fitClass(o.fitScore))}>
                              {o.fitScore}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", TONE_CLASS[tl.tone])} title={localDeadline(o.deadlineAt)}>
                            <IconClock className="size-3" />
                            {tl.label}
                          </span>
                          {o.prizeUsd != null ? (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                              <IconTrophy className="size-3" />
                              {money(o.prizeUsd)}
                            </span>
                          ) : null}
                          {o.host ? (
                            <a href={o.url ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                              {o.host}
                              <IconExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>
                        {o.checklistTotal ? (
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {o.checklistDone}/{o.checklistTotal} steps
                            </p>
                          </div>
                        ) : null}
                        <div className="mt-1 flex justify-between opacity-60 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="size-6" aria-label="Move left" disabled={col.id === COLUMNS[0].id} onClick={() => shift(o.id, o.status, -1)}>
                            <IconChevronLeft className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-6" aria-label="Move right" disabled={col.id === COLUMNS[COLUMNS.length - 1]?.id} onClick={() => shift(o.id, o.status, 1)}>
                            <IconChevronRight className="size-3.5" />
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
