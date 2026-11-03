import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowLeft, IconCheck, IconExternalLink, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { COLUMNS, fitClass, localDeadline, money, TONE_CLASS, timeLeft, type Status } from "@/lib/opportunity-format";
import { cn } from "@/lib/utils";

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function OpportunityRoute() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isPending, error } = useActionQuery("get-opportunity", { id });
  const opp = data?.opportunity;
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prize, setPrize] = useState("");

  useEffect(() => {
    if (!opp) return;
    setNotes(opp.notes ?? "");
    setDeadline(toLocalInput(opp.deadlineAt));
    setPrize(opp.prizeUsd != null ? String(opp.prizeUsd) : "");
  }, [opp?.id, opp?.updatedAt]);

  const onError = (e: unknown) => toast.error(actionErrorMessage(e) ?? "Something went wrong");
  const update = useActionMutation("update-opportunity", { onError });
  const toggle = useActionMutation("update-checklist-item", { onError });
  const addSteps = useActionMutation("add-checklist-items", { onError, onSuccess: () => setStep("") });
  const remove = useActionMutation("delete-opportunity", {
    onError,
    onSuccess: () => navigate("/board"),
  });

  if (isPending) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-4 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </main>
    );
  }
  if (error || !opp) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted-foreground">This opportunity isn't on your board.</p>
        <Link to="/board" className="mt-2 inline-block text-sm underline">Back to board</Link>
      </main>
    );
  }

  const tl = timeLeft(opp.deadlineAt);
  const checklist = data.checklist;
  const done = checklist.filter((c) => c.done).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <Link to="/board" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <IconArrowLeft className="size-4" /> Board
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{opp.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded px-2 py-0.5", TONE_CLASS[tl.tone])}>{tl.label}</span>
            {opp.deadlineAt ? <span className="text-muted-foreground">{localDeadline(opp.deadlineAt)}</span> : null}
            {opp.prizeUsd != null ? <span className="rounded bg-muted px-2 py-0.5">{money(opp.prizeUsd)}</span> : null}
            <span className="rounded bg-muted px-2 py-0.5 capitalize">{opp.kind}</span>
            {opp.url ? (
              <a href={opp.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                {opp.host ?? "Open"} <IconExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        </div>
        <select
          aria-label="Status"
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          value={opp.status}
          onChange={(e) => update.mutate({ id, status: e.target.value as Status })}
        >
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </header>

      {opp.fitScore != null || opp.summary ? (
        <section className="rounded-xl border border-border bg-card p-4">
          {opp.fitScore != null ? (
            <p className="flex items-start gap-2 text-sm">
              <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", fitClass(opp.fitScore))}>Fit {opp.fitScore}</span>
              <span className="text-muted-foreground">{opp.fitReason}</span>
            </p>
          ) : null}
          {opp.summary ? <p className="mt-2 whitespace-pre-wrap text-sm">{opp.summary}</p> : null}
          {opp.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {opp.tags.map((t) => (
                <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">#{t}</span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-baseline justify-between text-sm font-medium">
          Submission checklist <span className="text-xs text-muted-foreground">{done}/{checklist.length}</span>
        </h2>
        <ul className="mt-3 flex flex-col gap-1">
          {checklist.length === 0 ? (
            <li className="text-sm text-muted-foreground">No steps yet. Ask the agent: "read the rules and build my checklist".</li>
          ) : null}
          {checklist.map((c) => {
            const ctl = c.dueAt ? timeLeft(c.dueAt) : null;
            return (
              <li key={c.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
                <button
                  type="button"
                  aria-label={c.done ? "Mark not done" : "Mark done"}
                  onClick={() => toggle.mutate({ id: c.id, done: !c.done })}
                  className={cn("flex size-5 shrink-0 items-center justify-center rounded border", c.done ? "border-primary bg-primary text-primary-foreground" : "border-border")}
                >
                  {c.done ? <IconCheck className="size-3.5" /> : null}
                </button>
                <span className={cn("flex-1 text-sm", c.done && "text-muted-foreground line-through")}>{c.label}</span>
                {ctl ? <span className={cn("rounded px-1.5 py-0.5 text-[11px]", TONE_CLASS[ctl.tone])} title={localDeadline(c.dueAt)}>{ctl.label}</span> : null}
                <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100" aria-label="Remove step" onClick={() => toggle.mutate({ id: c.id, remove: true })}>
                  <IconTrash className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (step.trim()) addSteps.mutate({ opportunityId: id, items: [{ label: step.trim() }] });
          }}
        >
          <Input placeholder="Add a step" value={step} onChange={(e) => setStep(e.target.value)} />
          <Button type="submit" variant="outline" disabled={!step.trim() || addSteps.isPending}>Add</Button>
        </form>
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="deadline">Deadline (your time)</Label>
          <Input
            id="deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => {
              const iso = deadline ? new Date(deadline).toISOString() : null;
              if (iso !== (opp.deadlineAt ?? null)) update.mutate({ id, deadlineAt: iso });
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prize">Prize pool (USD)</Label>
          <Input
            id="prize"
            inputMode="numeric"
            value={prize}
            onChange={(e) => setPrize(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => {
              const v = prize ? Number(prize) : null;
              if (v !== (opp.prizeUsd ?? null)) update.mutate({ id, prizeUsd: v });
            }}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            rows={5}
            className="rounded-md border border-border bg-background p-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (opp.notes ?? "")) update.mutate({ id, notes: notes || null });
            }}
            placeholder="Ideas, links, what the agent should know…"
          />
        </div>
      </section>

      <div>
        <Button
          variant="ghost"
          className="text-red-600"
          onClick={() => {
            if (confirm(`Delete "${opp.title}" from your board?`)) remove.mutate({ id });
          }}
        >
          <IconTrash className="mr-1 size-4" /> Delete
        </Button>
      </div>
    </main>
  );
}
