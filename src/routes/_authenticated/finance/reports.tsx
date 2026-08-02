import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader } from "@/components/page";
import { BarChartCard, LineChartCard, PieChartCard } from "@/components/simple-charts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, monthKey, sumBy } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/finance/reports")({
  head: () => ({
    meta: [
      { title: "Financial reports — Lycée Manager" },
      { name: "description", content: "Income by term, spending by category and outstanding balances per class." },
      { property: "og:title", content: "Financial reports — Lycée Manager" },
      { property: "og:description", content: "Income by term, spending by category and outstanding balances per class." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["economist"]} message="This page is for the economist / bursar.">
      <FinanceReports />
    </RequireRole>
  ),
});

function FinanceReports() {
  const data = useQuery({
    queryKey: ["finance-reports"],
    queryFn: async () => {
      const [payments, expenses, students, classes, structures] = await Promise.all([
        supabase.from("fee_payments").select("student_id, term, amount_paid, date"),
        supabase.from("expenses").select("category, amount, date"),
        supabase.from("students").select("id, class_id"),
        supabase.from("classes").select("id, name"),
        supabase.from("fee_structures").select("class_id, term, amount"),
      ]);
      const err = payments.error || expenses.error || students.error || classes.error || structures.error;
      if (err) throw err;
      return {
        payments: (payments.data ?? []) as { student_id: string; term: string; amount_paid: number; date: string }[],
        expenses: (expenses.data ?? []) as { category: string; amount: number; date: string }[],
        students: (students.data ?? []) as { id: string; class_id: string | null }[],
        classes: (classes.data ?? []) as { id: string; name: string }[],
        structures: (structures.data ?? []) as { class_id: string | null; term: string; amount: number }[],
      };
    },
  });

  const d = data.data;
  const incomeByTerm = sumBy(d?.payments ?? [], (p) => p.term, (p) => Number(p.amount_paid));
  const expensesByCategory = sumBy(d?.expenses ?? [], (e) => e.category, (e) => Number(e.amount));
  const incomeByMonth = sumBy(d?.payments ?? [], (p) => monthKey(p.date), (p) => Number(p.amount_paid)).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  const perClass = (d?.classes ?? []).map((c) => {
    const studentIds = (d?.students ?? []).filter((s) => s.class_id === c.id).map((s) => s.id);
    const expected =
      studentIds.length *
      (d?.structures ?? []).filter((f) => f.class_id === c.id).reduce((a, r) => a + Number(r.amount), 0);
    const collected = (d?.payments ?? [])
      .filter((p) => studentIds.includes(p.student_id))
      .reduce((a, p) => a + Number(p.amount_paid), 0);
    return { name: c.name, students: studentIds.length, expected, collected, balance: expected - collected };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader title="Financial reports" description="Where the money comes from and where it goes." />

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard title="Income by term" data={incomeByTerm} />
        <PieChartCard title="Expenses by category" data={expensesByCategory} />
      </div>

      <LineChartCard title="Collections by month" data={incomeByMonth} />

      <Card className="surface-card overflow-x-auto">
        <CardHeader>
          <CardTitle className="text-base">Balance per class</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perClass.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right tabular-nums">{r.students}</TableCell>
                <TableCell className="text-right tabular-nums">{money(r.expected)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(r.collected)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(Math.max(r.balance, 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
