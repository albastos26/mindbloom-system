import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TERMS, money } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/finance/structures")({
  head: () => ({
    meta: [
      { title: "Fee structures — Lycée Manager" },
      { name: "description", content: "Set the fees due per class and term with their due dates." },
      { property: "og:title", content: "Fee structures — Lycée Manager" },
      { property: "og:description", content: "Set the fees due per class and term with their due dates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["economist"]} message="This page is for the economist / bursar.">
      <StructuresPage />
    </RequireRole>
  ),
});

type Structure = { id: string; class_id: string | null; term: string; amount: number; due_date: string | null };

const empty = { id: "", class_id: "", term: TERMS[0] as string, amount: "", due_date: "" };

function StructuresPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });

  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const structures = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_structures")
        .select("id, class_id, term, amount, due_date")
        .order("term");
      if (error) throw error;
      return (data ?? []) as Structure[];
    },
  });

  const classById = useMemo(
    () => new Map((classes.data ?? []).map((c) => [c.id, c.name])),
    [classes.data],
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        class_id: form.class_id || null,
        term: form.term,
        amount: Number(form.amount || 0),
        due_date: form.due_date || null,
      };
      const { error } = form.id
        ? await supabase.from("fee_structures").update(payload).eq("id", form.id)
        : await supabase.from("fee_structures").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Fee updated" : "Fee added");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["fee-structures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Fee structures" description="What each class owes per term." />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {(classes.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" disabled={save.isPending}>
                {form.id ? "Save changes" : "Add fee"}
              </Button>
              {form.id ? (
                <Button type="button" variant="ghost" onClick={() => setForm({ ...empty })}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {(structures.data ?? []).length === 0 ? (
        <EmptyState message="No fee structures yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(structures.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.class_id ? classById.get(s.class_id) ?? "—" : "All classes"}</TableCell>
                  <TableCell>{s.term}</TableCell>
                  <TableCell>{s.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          id: s.id,
                          class_id: s.class_id ?? "",
                          term: s.term,
                          amount: String(s.amount),
                          due_date: s.due_date ?? "",
                        })
                      }
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
