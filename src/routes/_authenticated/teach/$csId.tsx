import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TeacherOnly } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/teach/$csId")({
  component: () => (
    <TeacherOnly>
      <ClassSubjectPage />
    </TeacherOnly>
  ),
});

const ATTENDANCE = ["present", "absent", "late", "excused"] as const;
const today = () => new Date().toISOString().slice(0, 10);

function ClassSubjectPage() {
  const { csId } = Route.useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const cs = useQuery({
    queryKey: ["class-subject", csId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, class_id, teacher_id, classes(name), subjects(name, code)")
        .eq("id", csId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        class_id: string;
        teacher_id: string | null;
        classes: { name: string } | null;
        subjects: { name: string; code: string } | null;
      } | null;
    },
  });

  const students = useQuery({
    queryKey: ["class-students", cs.data?.class_id],
    enabled: !!cs.data?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .eq("class_id", cs.data!.class_id)
        .order("admission_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (cs.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!cs.data) return <EmptyState message="This class-subject was not found." />;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/teach"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> My classes
      </Link>
      <PageHeader
        title={`${cs.data.subjects?.name} · ${cs.data.classes?.name}`}
        description={`${students.data?.length ?? 0} students enrolled in this class.`}
      />

      <Tabs defaultValue="attendance">
        <TabsList className="mb-6">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Evaluations & grades</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <AttendanceTab
            csId={csId}
            students={students.data ?? []}
            recordedBy={profile?.id ?? null}
          />
        </TabsContent>
        <TabsContent value="grades">
          <GradesTab csId={csId} students={students.data ?? []} qc={qc} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Student = { id: string; full_name: string; admission_number: string };

function AttendanceTab({
  csId,
  students,
  recordedBy,
}: {
  csId: string;
  students: Student[];
  recordedBy: string | null;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, string>>({});

  const existing = useQuery({
    queryKey: ["attendance", csId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, student_id, status")
        .eq("class_subject_id", csId)
        .eq("date", date);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const s of students) next[s.id] = "present";
    for (const r of existing.data ?? []) next[r.student_id] = r.status;
    setMarks(next);
  }, [students, existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error: delError } = await supabase
        .from("attendance_records")
        .delete()
        .eq("class_subject_id", csId)
        .eq("date", date);
      if (delError) throw delError;
      const rows = students.map((s) => ({
        class_subject_id: csId,
        student_id: s.id,
        date,
        status: marks[s.id] ?? "present",
        recorded_by: recordedBy,
      }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("attendance_records").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      void qc.invalidateQueries({ queryKey: ["attendance", csId, date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="surface-card">
      <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label>Session date</Label>
          <Input
            type="date"
            className="w-48"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || students.length === 0}>
          Save attendance
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {students.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState message="No students in this class yet." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adm. no.</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="w-48">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.admission_number}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>
                    <Select
                      value={marks[s.id] ?? "present"}
                      onValueChange={(v) => setMarks((m) => ({ ...m, [s.id]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTENDANCE.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a[0]!.toUpperCase() + a.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function GradesTab({
  csId,
  students,
  qc,
}: {
  csId: string;
  students: Student[];
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [form, setForm] = useState({ term: "Term 1", type: "test", date: today(), max_score: "20" });
  const [selected, setSelected] = useState("");
  const [entries, setEntries] = useState<Record<string, { score: string; remarks: string }>>({});

  const evaluations = useQuery({
    queryKey: ["evaluations", csId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, term, type, date, max_score")
        .eq("class_subject_id", csId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const grades = useQuery({
    queryKey: ["grades", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("id, student_id, score, remarks")
        .eq("evaluation_id", selected);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const next: Record<string, { score: string; remarks: string }> = {};
    for (const s of students) next[s.id] = { score: "", remarks: "" };
    for (const g of grades.data ?? []) {
      next[g.student_id] = { score: g.score?.toString() ?? "", remarks: g.remarks ?? "" };
    }
    setEntries(next);
  }, [students, grades.data]);

  const activeEval = useMemo(
    () => (evaluations.data ?? []).find((e) => e.id === selected),
    [evaluations.data, selected],
  );

  const createEval = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .insert({
          class_subject_id: csId,
          term: form.term,
          type: form.type,
          date: form.date,
          max_score: Number(form.max_score),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Evaluation created");
      setSelected(id);
      void qc.invalidateQueries({ queryKey: ["evaluations", csId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveGrades = useMutation({
    mutationFn: async () => {
      const rows = students
        .filter((s) => entries[s.id]?.score !== "" || entries[s.id]?.remarks)
        .map((s) => ({
          evaluation_id: selected,
          student_id: s.id,
          score: entries[s.id]?.score === "" ? null : Number(entries[s.id]?.score),
          remarks: entries[s.id]?.remarks || null,
        }));
      const { error: delError } = await supabase
        .from("grades")
        .delete()
        .eq("evaluation_id", selected);
      if (delError) throw delError;
      if (rows.length === 0) return;
      const { error } = await supabase.from("grades").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grades saved");
      void qc.invalidateQueries({ queryKey: ["grades", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">New evaluation</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              createEval.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={form.term} onValueChange={(v) => setForm({ ...form, term: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
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
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
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
            <div className="space-y-2">
              <Label>Max score</Label>
              <Input
                type="number"
                min="1"
                value={form.max_score}
                onChange={(e) => setForm({ ...form, max_score: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={createEval.isPending}>
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Label>Evaluation</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select an evaluation" />
              </SelectTrigger>
              <SelectContent>
                {(evaluations.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.term} · {e.type} · {e.date} (/{e.max_score})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => saveGrades.mutate()}
            disabled={!selected || saveGrades.isPending || students.length === 0}
          >
            Save grades
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {!selected ? (
            <div className="px-6 pb-6">
              <EmptyState message="Select or create an evaluation to enter grades." />
            </div>
          ) : students.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState message="No students in this class yet." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adm. no.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-32">Score /{activeEval?.max_score ?? ""}</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.admission_number}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={activeEval?.max_score ?? undefined}
                        value={entries[s.id]?.score ?? ""}
                        onChange={(e) =>
                          setEntries((prev) => ({
                            ...prev,
                            [s.id]: { score: e.target.value, remarks: prev[s.id]?.remarks ?? "" },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Optional remark"
                        value={entries[s.id]?.remarks ?? ""}
                        onChange={(e) =>
                          setEntries((prev) => ({
                            ...prev,
                            [s.id]: { score: prev[s.id]?.score ?? "", remarks: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
