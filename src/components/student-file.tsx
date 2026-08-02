import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/school";

type GradeRow = {
  score: number | null;
  remarks: string | null;
  evaluations: {
    term: string;
    type: string;
    date: string;
    max_score: number;
    class_subjects: { subjects: { name: string } | null } | null;
  } | null;
};

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  class_subjects: { subjects: { name: string } | null } | null;
};

export function useStudentFile(studentId: string | undefined, classId: string | null | undefined) {
  return useQuery({
    queryKey: ["student-file", studentId, classId],
    enabled: !!studentId,
    queryFn: async () => {
      const [grades, attendance, discipline, payments, structures] = await Promise.all([
        supabase
          .from("grades")
          .select("score, remarks, evaluations(term, type, date, max_score, class_subjects(subjects(name)))")
          .eq("student_id", studentId!),
        supabase
          .from("attendance_records")
          .select("id, date, status, class_subjects(subjects(name))")
          .eq("student_id", studentId!)
          .order("date", { ascending: false }),
        supabase
          .from("discipline_records")
          .select("id, date, type, severity, status, description")
          .eq("student_id", studentId!)
          .order("date", { ascending: false }),
        supabase
          .from("fee_payments")
          .select("id, date, term, amount_paid, method, receipt_number")
          .eq("student_id", studentId!)
          .order("date", { ascending: false }),
        classId
          ? supabase.from("fee_structures").select("term, amount, due_date").eq("class_id", classId)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const err =
        grades.error || attendance.error || discipline.error || payments.error || (structures as { error: unknown }).error;
      if (err) throw err;
      return {
        grades: (grades.data ?? []) as unknown as GradeRow[],
        attendance: (attendance.data ?? []) as unknown as AttendanceRow[],
        discipline: (discipline.data ?? []) as {
          id: string;
          date: string;
          type: string;
          severity: string;
          status: string;
          description: string | null;
        }[],
        payments: (payments.data ?? []) as {
          id: string;
          date: string;
          term: string;
          amount_paid: number;
          method: string | null;
          receipt_number: string | null;
        }[],
        structures: ((structures as { data: unknown }).data ?? []) as {
          term: string;
          amount: number;
          due_date: string | null;
        }[],
      };
    },
  });
}

export function StudentFile({
  studentId,
  classId,
}: {
  studentId: string | undefined;
  classId: string | null | undefined;
}) {
  const file = useStudentFile(studentId, classId);
  const d = file.data;

  if (!studentId) return <EmptyState message="Select a student to see their file." />;
  if (file.isLoading) return <EmptyState message="Loading…" />;

  const grades = d?.grades ?? [];
  const attendance = d?.attendance ?? [];
  const scored = grades.filter((g) => g.score != null && g.evaluations);
  const average =
    scored.length === 0
      ? null
      : (scored.reduce((s, g) => s + (Number(g.score) / Number(g.evaluations!.max_score)) * 20, 0) / scored.length);
  const presentRate =
    attendance.length === 0
      ? null
      : Math.round((attendance.filter((a) => a.status === "present").length / attendance.length) * 100);
  const paid = (d?.payments ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
  const due = (d?.structures ?? []).reduce((s, f) => s + Number(f.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average / 20" value={average == null ? "—" : average.toFixed(2)} />
        <StatCard label="Attendance" value={presentRate == null ? "—" : `${presentRate}%`} />
        <StatCard label="Open discipline" value={(d?.discipline ?? []).filter((r) => r.status === "open").length} />
        <StatCard label="Fees balance" value={money(Math.max(due - paid, 0))} hint={`${money(paid)} paid`} />
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <Card className="surface-card overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base">Evaluation results</CardTitle>
            </CardHeader>
            {grades.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No grades recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell>{g.evaluations?.date ?? "—"}</TableCell>
                      <TableCell className="font-medium">
                        {g.evaluations?.class_subjects?.subjects?.name ?? "—"}
                      </TableCell>
                      <TableCell>{g.evaluations?.term ?? "—"}</TableCell>
                      <TableCell className="capitalize">{g.evaluations?.type ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.score == null ? "—" : `${g.score} / ${g.evaluations?.max_score ?? 20}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{g.remarks || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="surface-card overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base">Attendance history</CardTitle>
            </CardHeader>
            {attendance.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No attendance recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{a.class_subjects?.subjects?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "present" ? "secondary" : "destructive"} className="capitalize">
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="discipline">
          <Card className="surface-card overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base">Discipline record</CardTitle>
            </CardHeader>
            {(d?.discipline ?? []).length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No incidents recorded. </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.discipline ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="capitalize">{r.type}</TableCell>
                      <TableCell className="capitalize">{r.severity}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{r.description || "—"}</TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card className="surface-card overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base">Fee payments</CardTitle>
            </CardHeader>
            {(d?.payments ?? []).length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.payments ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.date}</TableCell>
                      <TableCell>{p.term}</TableCell>
                      <TableCell className="capitalize">{p.method ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.receipt_number ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(p.amount_paid)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
