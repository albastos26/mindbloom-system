import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TERMS } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/transcripts")({
  head: () => ({
    meta: [
      { title: "Student transcripts — Lycée Manager" },
      { name: "description", content: "Generate and print per-term student transcripts with all evaluations and grades." },
      { property: "og:title", content: "Student transcripts — Lycée Manager" },
      { property: "og:description", content: "Generate and print per-term student transcripts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["teacher"]} message="Transcripts are available to teaching and academic staff.">
      <TranscriptsPage />
    </RequireRole>
  ),
});

type Student = { id: string; full_name: string; admission_number: string; class_id: string | null; classes: { name: string } | null };

function TranscriptsPage() {
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState<string>(TERMS[0]);

  const students = useQuery({
    queryKey: ["students-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, class_id, classes(name)")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as Student[];
    },
  });

  const student = (students.data ?? []).find((s) => s.id === studentId);

  const transcript = useQuery({
    queryKey: ["transcript", studentId, term],
    enabled: !!student?.class_id,
    queryFn: async () => {
      const { data: cs, error: csError } = await supabase
        .from("class_subjects")
        .select("id, subjects(name, code), users(full_name)")
        .eq("class_id", student!.class_id!);
      if (csError) throw csError;
      const csRows = (cs ?? []) as unknown as {
        id: string;
        subjects: { name: string; code: string } | null;
        users: { full_name: string } | null;
      }[];
      if (csRows.length === 0) return [];

      const { data: evals, error: evalError } = await supabase
        .from("evaluations")
        .select("id, class_subject_id, term, type, date, max_score")
        .in("class_subject_id", csRows.map((r) => r.id))
        .eq("term", term)
        .order("date");
      if (evalError) throw evalError;
      const evalRows = evals ?? [];
      if (evalRows.length === 0) return csRows.map((r) => ({ cs: r, lines: [] as Line[] }));

      const { data: grades, error: gradeError } = await supabase
        .from("grades")
        .select("evaluation_id, score, remarks")
        .eq("student_id", studentId)
        .in("evaluation_id", evalRows.map((e) => e.id));
      if (gradeError) throw gradeError;

      const byEval = new Map((grades ?? []).map((g) => [g.evaluation_id, g]));
      return csRows.map((r) => ({
        cs: r,
        lines: evalRows
          .filter((e) => e.class_subject_id === r.id)
          .map<Line>((e) => ({
            id: e.id,
            type: e.type,
            date: e.date,
            max_score: Number(e.max_score),
            score: byEval.get(e.id)?.score == null ? null : Number(byEval.get(e.id)!.score),
            remarks: byEval.get(e.id)?.remarks ?? "",
          })),
      }));
    },
  });

  const sections = transcript.data ?? [];
  const overall = averageOf(sections.flatMap((s) => s.lines));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Transcripts"
        description="Per-term results across every subject, ready to print or save as PDF."
      />

      <Card className="surface-card mb-8 no-print">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
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
            <Select value={term} onValueChange={setTerm}>
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
          <div className="md:col-span-3">
            <Button disabled={!student} onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print / save as PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {!student ? (
        <EmptyState message="Select a student to build their transcript." />
      ) : (
        <div className="print-area space-y-6">
          <div className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold">Transcript — {term}</h2>
            <p className="text-sm text-muted-foreground">
              {student.full_name} · {student.admission_number} · {student.classes?.name ?? "No class"}
            </p>
            <p className="mt-2 text-sm">
              Overall average: <span className="font-semibold">{overall === null ? "—" : `${overall}%`}</span>
            </p>
          </div>

          {sections.length === 0 ? (
            <EmptyState message="No subjects are assigned to this student's class yet." />
          ) : (
            sections.map((section) => (
              <Card key={section.cs.id} className="surface-card">
                <div className="flex items-baseline justify-between px-6 pt-5">
                  <h3 className="font-semibold">{section.cs.subjects?.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {section.cs.users?.full_name ?? "Unassigned"} · avg {averageOf(section.lines) ?? "—"}
                    {averageOf(section.lines) === null ? "" : "%"}
                  </span>
                </div>
                {section.lines.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">No evaluations recorded this term.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.date}</TableCell>
                          <TableCell className="capitalize">{l.type}</TableCell>
                          <TableCell>
                            {l.score === null ? "—" : `${l.score} / ${l.max_score}`}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{l.remarks || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type Line = { id: string; type: string; date: string; max_score: number; score: number | null; remarks: string };

function averageOf(lines: Line[]) {
  const scored = lines.filter((l) => l.score !== null && l.max_score > 0);
  if (scored.length === 0) return null;
  const pct = scored.reduce((acc, l) => acc + (l.score! / l.max_score) * 100, 0) / scored.length;
  return Math.round(pct * 10) / 10;
}
