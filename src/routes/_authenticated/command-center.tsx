import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, HeartPulse, Package, ShieldAlert, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/role-guard";
import { PageHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { BarChartCard, LineChartCard, PieChartCard } from "@/components/simple-charts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countBy, money, monthKey, sumBy } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/command-center")({
  head: () => ({
    meta: [
      { title: "Command centre — Lycée Manager" },
      { name: "description", content: "Whole-school oversight: enrolment, results, discipline, health, finance and stock." },
      { property: "og:title", content: "Command centre — Lycée Manager" },
      { property: "og:description", content: "Whole-school oversight: enrolment, results, discipline, health, finance and stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <CommandCenter />
    </AdminOnly>
  ),
});

function CommandCenter() {
  const data = useQuery({
    queryKey: ["command-center"],
    queryFn: async () => {
      const [
        students,
        classes,
        users,
        discipline,
        medical,
        payments,
        expenses,
        items,
        attendance,
        audit,
      ] = await Promise.all([
        supabase.from("students").select("id, class_id, gender"),
        supabase.from("classes").select("id, name"),
        supabase.from("users").select("id, role, full_name"),
        supabase.from("discipline_records").select("id, severity, status, date"),
        supabase.from("medical_visits").select("id, date"),
        supabase.from("fee_payments").select("amount_paid, date, term"),
        supabase.from("expenses").select("amount, category, date"),
        supabase.from("stock_items").select("id, quantity_on_hand, reorder_threshold"),
        supabase.from("attendance_records").select("id, status, date"),
        supabase
          .from("audit_log")
          .select("id, action, entity, details, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      return {
        students: (students.data ?? []) as { id: string; class_id: string | null; gender: string | null }[],
        classes: (classes.data ?? []) as { id: string; name: string }[],
        users: (users.data ?? []) as { id: string; role: string; full_name: string }[],
        discipline: (discipline.data ?? []) as { id: string; severity: string; status: string; date: string }[],
        medical: (medical.data ?? []) as { id: string; date: string }[],
        payments: (payments.data ?? []) as { amount_paid: number; date: string; term: string }[],
        expenses: (expenses.data ?? []) as { amount: number; category: string; date: string }[],
        items: (items.data ?? []) as { id: string; quantity_on_hand: number; reorder_threshold: number }[],
        attendance: (attendance.data ?? []) as { id: string; status: string; date: string }[],
        audit: (audit.data ?? []) as {
          id: string;
          action: string;
          entity: string;
          details: string | null;
          created_at: string;
          user_id: string | null;
        }[],
      };
    },
  });

  const d = data.data;
  const collected = (d?.payments ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
  const spent = (d?.expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const lowStock = (d?.items ?? []).filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_threshold)).length;
  const openCases = (d?.discipline ?? []).filter((r) => r.status === "open").length;
  const attendanceRate =
    (d?.attendance ?? []).length === 0
      ? null
      : Math.round(
          ((d?.attendance ?? []).filter((a) => a.status === "present").length / (d?.attendance ?? []).length) * 100,
        );

  const classNameById = new Map((d?.classes ?? []).map((c) => [c.id, c.name]));
  const userById = new Map((d?.users ?? []).map((u) => [u.id, u.full_name]));

  const perClass = countBy(d?.students ?? [], (s) => (s.class_id ? classNameById.get(s.class_id) ?? "—" : "Unassigned"));
  const staffByRole = countBy(
    (d?.users ?? []).filter((u) => u.role !== "student" && u.role !== "parent"),
    (u) => u.role.replace(/_/g, " "),
  );
  const cashByMonth = sumBy(d?.payments ?? [], (p) => monthKey(p.date), (p) => Number(p.amount_paid)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Command centre"
        description="One screen for the whole school: people, academics, discipline, health, money and stock."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Students" value={(d?.students ?? []).length} icon={GraduationCap} />
        <StatCard label="Accounts" value={(d?.users ?? []).length} icon={Users} />
        <StatCard
          label="Attendance rate"
          value={attendanceRate == null ? "—" : `${attendanceRate}%`}
          hint="All recorded sessions"
        />
        <StatCard label="Open discipline cases" value={openCases} icon={ShieldAlert} />
        <StatCard label="Infirmary visits" value={(d?.medical ?? []).length} icon={HeartPulse} />
        <StatCard label="Low stock items" value={lowStock} icon={Package} />
        <StatCard label="Fees collected" value={money(collected)} icon={Wallet} />
        <StatCard label="Expenses" value={money(spent)} icon={Wallet} />
        <StatCard label="Net position" value={money(collected - spent)} icon={Wallet} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard title="Students per class" data={perClass} />
        <PieChartCard title="Staff by role" data={staffByRole} />
      </div>

      <LineChartCard title="Fee collections by month" data={cashByMonth} />

      <Card className="surface-card overflow-x-auto">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        {(d?.audit ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No activity logged yet. Entries appear here as staff record actions across the modules.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(d?.audit ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                  <TableCell>{a.user_id ? userById.get(a.user_id) ?? "—" : "System"}</TableCell>
                  <TableCell className="font-medium capitalize">{a.action}</TableCell>
                  <TableCell className="capitalize">{a.entity}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{a.details || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
