import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Receipt, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_METHODS, TERMS, money, receiptNumber, today } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({
    meta: [
      { title: "Fee payments — Lycée Manager" },
      { name: "description", content: "Record school fee payments, issue receipts and follow the balance per student." },
      { property: "og:title", content: "Fee payments — Lycée Manager" },
      { property: "og:description", content: "Record school fee payments, issue receipts and follow the balance per student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["economist"]} message="This page is for the economist / bursar.">
      <PaymentsPage />
    </RequireRole>
  ),
});

type Student = { id: string; full_name: string; admission_number: string; class_id: string | null };
type Payment = {
  id: string;
  student_id: string;
  term: string;
  amount_paid: number;
  date: string;
  method: string | null;
  receipt_number: string | null;
};

const emptyForm = {
  student_id: "",
  term: TERMS[0] as string,
  amount_paid: "",
  date: today(),
  method: PAYMENT_METHODS[0] as string,
  receipt_number: receiptNumber(),
};

function PaymentsPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState("all");

  const students = useQuery({
    queryKey: ["students-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, class_id")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const payments = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_payments")
        .select("id, student_id, term, amount_paid, date, method, receipt_number")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("id, amount, date");
      if (error) throw error;
      return (data ?? []) as { id: string; amount: number; date: string }[];
    },
  });

  const structures = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_structures").select("id, class_id, term, amount");
      if (error) throw error;
      return (data ?? []) as { id: string; class_id: string | null; term: string; amount: number }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fee_payments").insert({
        student_id: form.student_id,
        term: form.term,
        amount_paid: Number(form.amount_paid || 0),
        date: form.date,
        method: form.method,
        receipt_number: form.receipt_number || receiptNumber(),
        recorded_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setForm({ ...emptyForm, receipt_number: receiptNumber() });
      void qc.invalidateQueries({ queryKey: ["fee-payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const studentById = useMemo(() => new Map((students.data ?? []).map((s) => [s.id, s])), [students.data]);

  const collected = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const spent = (expenses.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  const expected = (students.data ?? []).reduce((sum, s) => {
    const rows = (structures.data ?? []).filter((f) => f.class_id === s.class_id);
    return sum + rows.reduce((a, r) => a + Number(r.amount), 0);
  }, 0);

  const filtered = (payments.data ?? []).filter((p) => {
    if (termFilter !== "all" && p.term !== termFilter) return false;
    if (search) {
      const s = studentById.get(p.student_id);
      const hay = `${s?.full_name ?? ""} ${s?.admission_number ?? ""} ${p.receipt_number ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Fee payments"
        description="Record payments, issue receipt numbers and watch the school's cash position."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/finance/structures">Fee structures</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/finance/expenses">Expenses</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/finance/reports">Reports</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected" value={money(collected)} icon={TrendingUp} />
        <StatCard label="Expected" value={money(expected)} hint="From fee structures" icon={Receipt} />
        <StatCard label="Outstanding" value={money(Math.max(expected - collected, 0))} icon={Wallet} />
        <StatCard label="Expenses" value={money(spent)} icon={TrendingDown} />
      </div>

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.student_id) {
                toast.error("Pick a student");
                return;
              }
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {(students.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} · {s.admission_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={form.term} onValueChange={(v) => setForm({ ...form, term: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receipt number</Label>
              <Input
                value={form.receipt_number}
                onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Record payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Search student or receipt"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All terms</SelectItem>
            {TERMS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No payments recorded yet." />
      ) : (
        <Card className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell className="font-medium">{studentById.get(p.student_id)?.full_name ?? "—"}</TableCell>
                  <TableCell>{p.term}</TableCell>
                  <TableCell className="capitalize">{p.method ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.receipt_number ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(p.amount_paid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
