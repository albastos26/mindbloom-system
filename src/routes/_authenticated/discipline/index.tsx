import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DISCIPLINE_SEVERITIES, DISCIPLINE_STATUSES, DISCIPLINE_TYPES, today } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/discipline/")({
  head: () => ({
    meta: [
      { title: "Discipline records — Lycée Manager" },
      { name: "description", content: "Log faults and punishments per student and follow up on open cases." },
      { property: "og:title", content: "Discipline records — Lycée Manager" },
      { property: "og:description", content: "Log faults and punishments per student and follow up on open cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["head_of_discipline"]} message="This page is for the head of discipline.">
      <DisciplinePage />
    </RequireRole>
  ),
});

type Student = { id: string; full_name: string; admission_number: string; class_id: string | null };
type Record_ = {
  id: string;
  student_id: string;
  type: string;
  description: string | null;
  date: string;
  severity: string;
  status: string;
};

const emptyForm = {
  student_id: "",
  type: "fault",
  severity: "low",
  date: today(),
  description: "",
};

function DisciplinePage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

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

  const records = useQuery({
    queryKey: ["discipline-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discipline_records")
        .select("id, student_id, type, description, date, severity, status")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record_[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discipline_records").insert({
        student_id: form.student_id,
        type: form.type,
        severity: form.severity,
        date: form.date,
        description: form.description || null,
        recorded_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record logged");
      setForm({ ...emptyForm });
      void qc.invalidateQueries({ queryKey: ["discipline-records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (row: Record_) => {
      const { error } = await supabase
        .from("discipline_records")
        .update({ status: row.status === "open" ? "resolved" : "open" })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["discipline-records"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const studentById = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s])),
    [students.data],
  );

  const filtered = (records.data ?? []).filter((r) => {
    const s = studentById.get(r.student_id);
    if (classFilter !== "all" && s?.class_id !== classFilter) return false;
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (search) {
      const hay = `${s?.full_name ?? ""} ${s?.admission_number ?? ""} ${r.description ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Discipline"
        description="Log faults and punishments, then track which cases are still open."
        action={
          <Button variant="outline" asChild>
            <Link to="/discipline/analytics">View analysis</Link>
          </Button>
        }
      />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.student_id) return toast.error("Pick a student");
              save.mutate();
            }}
          >
            <div className="space-y-2 md:col-span-2">
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
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINE_SEVERITIES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="What happened?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={save.isPending}>
                Log record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input placeholder="Search student or description" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {(classes.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DISCIPLINE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No discipline records match these filters." />
      ) : (
        <Card className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="font-medium">{studentById.get(r.student_id)?.full_name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{r.type}</TableCell>
                  <TableCell>
                    <Badge variant={r.severity === "high" ? "destructive" : "secondary"} className="capitalize">
                      {r.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{r.description || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="capitalize" onClick={() => toggleStatus.mutate(r)}>
                      {DISCIPLINE_STATUSES.includes(r.status as never) ? r.status : r.status}
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
