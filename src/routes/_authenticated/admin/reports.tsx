import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: () => (
    <AdminOnly>
      <ReportsPage />
    </AdminOnly>
  ),
});

function ReportsPage() {
  const perClass = useQuery({
    queryKey: ["report-students-per-class"],
    queryFn: async () => {
      const [{ data: classes, error: ce }, { data: students, error: se }] = await Promise.all([
        supabase.from("classes").select("id, name, level, academic_year").order("name"),
        supabase.from("students").select("id, class_id"),
      ]);
      if (ce) throw ce;
      if (se) throw se;
      return (classes ?? []).map((c) => ({
        ...c,
        count: (students ?? []).filter((s) => s.class_id === c.id).length,
      }));
    },
  });

  const perSubject = useQuery({
    queryKey: ["report-teachers-per-subject"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, subjects(name, code), classes(name), users(full_name, email)");
      if (error) throw error;
      type Row = {
        subjects: { name: string; code: string } | null;
        classes: { name: string } | null;
        users: { full_name: string; email: string } | null;
      };
      const rows = (data ?? []) as unknown as Row[];
      const map = new Map<string, { subject: string; teachers: Set<string>; classes: Set<string> }>();
      for (const r of rows) {
        const key = r.subjects?.code ?? r.subjects?.name ?? "—";
        const entry = map.get(key) ?? {
          subject: `${r.subjects?.name ?? "—"} (${key})`,
          teachers: new Set<string>(),
          classes: new Set<string>(),
        };
        if (r.users) entry.teachers.add(r.users.full_name || r.users.email);
        if (r.classes) entry.classes.add(r.classes.name);
        map.set(key, entry);
      }
      return [...map.values()];
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Reports" description="Enrolment and teaching coverage at a glance." />

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Students per class</CardTitle>
        </CardHeader>
        {(perClass.data ?? []).length === 0 ? (
          <div className="p-6">
            <EmptyState message="No classes yet." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Academic year</TableHead>
                <TableHead className="text-right">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(perClass.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.level || "—"}</TableCell>
                  <TableCell>{c.academic_year || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Teachers per subject</CardTitle>
        </CardHeader>
        {(perSubject.data ?? []).length === 0 ? (
          <div className="p-6">
            <EmptyState message="No subject assignments yet." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Teachers</TableHead>
                <TableHead>Classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(perSubject.data ?? []).map((s) => (
                <TableRow key={s.subject}>
                  <TableCell className="font-medium">{s.subject}</TableCell>
                  <TableCell>{[...s.teachers].join(", ") || "Unassigned"}</TableCell>
                  <TableCell>{[...s.classes].join(", ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
