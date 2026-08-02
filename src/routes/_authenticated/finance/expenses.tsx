import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXPENSE_CATEGORIES, money, today } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/finance/expenses")({
  head: () => ({
    meta: [
      { title: "School expenses — Lycée Manager" },
      { name: "description", content: "Track school spending by category with dates and notes." },
      { property: "og:title", content: "School expenses — Lycée Manager" },
      { property: "og:description", content: "Track school spending by category with dates and notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["economist"]} message="This page is for the economist / bursar.">
      <ExpensesPage />
    </RequireRole>
  ),
});

type Expense = { id: string; category: string; amount: number; date: string; description: string | null };

const empty = { category: EXPENSE_CATEGORIES[0] as string, amount: "", date: today(), description: "" };

function ExpensesPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({ ...empty });
  const [categoryFilter, setCategoryFilter] = useState("all");

  const expenses = useQuery({
    queryKey: ["expenses-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, category, amount, date, description")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        category: form.category,
        amount: Number(form.amount || 0),
        date: form.date,
        description: form.description || null,
        recorded_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense recorded");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["expenses-full"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (expenses.data ?? []).filter(
    (e) => categoryFilter === "all" || e.category === categoryFilter,
  );
  const total = rows.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Expenses" description="Every franc leaving the school, by category." />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={save.isPending}>
                Record expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground tabular-nums">{money(total)}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No expenses recorded yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="capitalize font-medium">{e.category}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{e.description || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
