import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { BarChartCard, LineChartCard, PieChartCard } from "@/components/simple-charts";
import { countBy, monthKey } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/discipline/analytics")({
  head: () => ({
    meta: [
      { title: "Discipline analysis — Lycée Manager" },
      { name: "description", content: "Incident trends by type, class and severity across the school year." },
      { property: "og:title", content: "Discipline analysis — Lycée Manager" },
      { property: "og:description", content: "Incident trends by type, class and severity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["head_of_discipline"]} message="This page is for the head of discipline.">
      <DisciplineAnalytics />
    </RequireRole>
  ),
});

function DisciplineAnalytics() {
  const data = useQuery({
    queryKey: ["discipline-analytics"],
    queryFn: async () => {
      const [records, students, classes] = await Promise.all([
        supabase.from("discipline_records").select("id, student_id, type, date, severity, status"),
        supabase.from("students").select("id, class_id"),
        supabase.from("classes").select("id, name"),
      ]);
      if (records.error) throw records.error;
      if (students.error) throw students.error;
      if (classes.error) throw classes.error;
      const classOf = new Map((students.data ?? []).map((s) => [s.id, s.class_id]));
      const className = new Map((classes.data ?? []).map((c) => [c.id, c.name]));
      return (records.data ?? []).map((r) => ({
        ...r,
        className: className.get(classOf.get(r.student_id) ?? "") ?? "Unassigned",
      }));
    },
  });

  const rows = data.data ?? [];
  const overTime = countBy(rows, (r) => monthKey(r.date)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Discipline analysis"
        description="Where incidents happen, how serious they are and how they trend."
        action={
          <Button variant="outline" asChild>
            <Link to="/discipline">Back to records</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total incidents" value={rows.length} />
        <StatCard label="Open cases" value={rows.filter((r) => r.status === "open").length} />
        <StatCard label="High severity" value={rows.filter((r) => r.severity === "high").length} />
        <StatCard label="Classes affected" value={new Set(rows.map((r) => r.className)).size} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard title="Incidents over time" data={overTime} />
        <BarChartCard title="Incidents by class" data={countBy(rows, (r) => r.className)} />
        <PieChartCard title="By type" data={countBy(rows, (r) => r.type)} />
        <PieChartCard title="By severity" data={countBy(rows, (r) => r.severity)} />
      </div>
    </div>
  );
}
