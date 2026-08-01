import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { today } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/medical/")({
  head: () => ({
    meta: [
      { title: "Infirmary — Lycée Manager" },
      { name: "description", content: "Record student medical visits and open each student's health file." },
      { property: "og:title", content: "Infirmary — Lycée Manager" },
      { property: "og:description", content: "Record student medical visits and open each student's health file." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["nurse"]} message="The infirmary is managed by the school nurse.">
      <MedicalPage />
    </RequireRole>
  ),
});

type Student = { id: string; full_name: string; admission_number: string };
type Visit = {
  id: string;
  student_id: string;
  date: string;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
};

const emptyForm = {
  student_id: "",
  date: today(),
  symptoms: "",
  diagnosis: "",
  treatment: "",
  notes: "",
};

function MedicalPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");

  const students = useQuery({
    queryKey: ["students-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const visits = useQuery({
    queryKey: ["medical-visits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_visits")
        .select("id, student_id, date, symptoms, diagnosis, treatment")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Visit[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("medical_visits").insert({
        student_id: form.student_id,
        date: form.date,
        symptoms: form.symptoms || null,
        diagnosis: form.diagnosis || null,
        treatment: form.treatment || null,
        notes: form.notes || null,
        recorded_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visit recorded");
      setForm({ ...emptyForm });
      void qc.invalidateQueries({ queryKey: ["medical-visits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const studentById = useMemo(() => new Map((students.data ?? []).map((s) => [s.id, s])), [students.data]);
  const rows = (visits.data ?? []).filter((v) => {
    if (!search) return true;
    const s = studentById.get(v.student_id);
    return `${s?.full_name ?? ""} ${s?.admission_number ?? ""} ${v.diagnosis ?? ""} ${v.symptoms ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const todayCount = (visits.data ?? []).filter((v) => v.date === today()).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Infirmary" description="Log consultations and keep a complete health file per student." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Visits today" value={todayCount} />
        <StatCard label="Total visits" value={(visits.data ?? []).length} />
        <StatCard label="Students seen" value={new Set((visits.data ?? []).map((v) => v.student_id)).size} />
      </div>

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
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
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Symptoms</Label>
              <Textarea
                rows={2}
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Textarea
                rows={2}
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Treatment</Label>
              <Textarea
                rows={2}
                value={form.treatment}
                onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                Record visit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4">
        <Input placeholder="Search visits" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No medical visits recorded yet." />
      ) : (
        <Card className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Symptoms</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.date}</TableCell>
                  <TableCell className="font-medium">{studentById.get(v.student_id)?.full_name ?? "—"}</TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">{v.symptoms || "—"}</TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">{v.diagnosis || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/medical/$studentId" params={{ studentId: v.student_id }}>
                        Health file
                      </Link>
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
