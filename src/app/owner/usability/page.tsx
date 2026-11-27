import { UsabilitySessionForm } from "@/components/owner/owner-forms";
import { Alert } from "@/components/ui/alert";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner · Usability tests" };

const TASKS: Record<string, string> = {
  find_product: "Find a product",
  request_refill: "Request a refill",
  complete_checkout: "Complete checkout",
  find_order_status: "Find an order’s status",
  other: "Other",
};

/** Average of a list, or null when empty. */
const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

/**
 * Usability testing log. Starts EMPTY: results are only ever entered from
 * real sessions with participants who agreed. Nothing here is invented, and
 * the demo reset never deletes it.
 */
export default async function UsabilityPage() {
  await requireRole(["owner"], "/owner/usability");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("usability_sessions").select("*").order("recorded_at", { ascending: false });
  const sessions = data ?? [];

  // Compare the previous process with the website, task by task.
  const comparison = Object.keys(TASKS).map((task) => {
    const pick = (method: string) => sessions.filter((s) => s.task === task && s.method === method);
    const summarize = (rows: typeof sessions) => ({
      n: rows.length,
      seconds: average(rows.map((r) => r.seconds_taken ?? 0).filter((v) => v > 0)),
      clicks: average(rows.flatMap((r) => (r.click_count === null ? [] : [r.click_count]))),
      completion: rows.length ? Math.round((rows.filter((r) => r.completed).length / rows.length) * 100) : null,
    });
    return { task, before: summarize(pick("previous_process")), after: summarize(pick("digital")) };
  }).filter((row) => row.before.n + row.after.n > 0);

  const show = (v: number | null, unit = "") => (v === null ? "—" : `${v}${unit}`);

  return (
    <>
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight">Usability tests</h1>
        <p className="text-lg text-ink/80">Time real people doing real tasks, the old way and on this website, then compare.</p>
      </div>
      <Alert tone="info" title="Honest results only">
        This log starts empty. Record a session only after a real test with a participant who agreed to it. Use participant codes, never names. The demo reset never deletes these results.
      </Alert>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Comparison</h2>
        {comparison.length === 0 ? (
          <p className="text-muted">No sessions recorded yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4">Task</th>
                  <th scope="col" className="py-2 pr-4">Previous process</th>
                  <th scope="col" className="py-2 pr-4">Website</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-line">
                {comparison.map((row) => (
                  <tr key={row.task}>
                    <th scope="row" className="py-2 pr-4 text-left font-medium">{TASKS[row.task]}</th>
                    {[row.before, row.after].map((s, i) => (
                      <td key={i} className="py-2 pr-4 text-sm">
                        {s.n === 0 ? "—" : `${show(s.seconds, " s")} · ${show(s.clicks, " clicks")} · ${show(s.completion, "%")} done (n=${s.n})`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Record a session</h2>
        <UsabilitySessionForm />
      </Card>

      {sessions.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="sessions">
          <h2 id="sessions" className="text-xl font-semibold">All sessions</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="tabular font-semibold">{s.participant_code}</span>
                <span>{TASKS[s.task]}</span>
                <Badge>{s.method === "digital" ? "Website" : "Previous process"}</Badge>
                <span className="tabular text-sm">{s.seconds_taken}s{s.click_count !== null ? ` · ${s.click_count} clicks` : ""}</span>
                <Badge tone={s.completed ? "success" : "danger"}>{s.completed ? "Completed" : "Not completed"}</Badge>
                {s.feedback && <span className="basis-full text-sm text-ink/80">“{s.feedback}”</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
