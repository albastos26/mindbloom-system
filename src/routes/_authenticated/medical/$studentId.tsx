import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/medical/$studentId")({
  head: () => ({
    meta: [
      { title: "Student health file — Lycée Manager" },
      { name: "description", content: "Full medical history for a student: every visit, diagnosis and treatment." },
      { property: "og:title", content: "Student health file — Lycée Manager" },
      { property: "og:description", content: "Full medical history for a student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["nurse"]} message="Health files are visible to the school nurse.">
      <HealthFile />
    </RequireRole>
  ),
});

function HealthFile() {
  const { studentId } = Route.useParams();

  const student = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, dob, gender, guardian_name, guardian_phone, classes(name)")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        full_name: string;
        admission_number: string;
        dob: string | null;
        gender: string | null;
        guardian_name: string | null;
        guardian_phone: string | null;
        classes: { name: string } | null;
      } | null;
    },
  });

  const visits = useQuery({
    queryKey: ["medical-history", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_visits")
        .select("id, date, symptoms, diagnosis, treatment, notes")
        .eq("student_id", studentId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Health file"
        description="Complete consultation history for this student."
        action={
          <div className="flex gap-2 no-print">
            <Button variant="outline" asChild>
              <Link to="/medical">Back</Link>
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      {student.isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (
        <div className="print-area space-y-4">
          <Card className="surface-card">
            <CardContent className="grid gap-2 pt-6 text-sm sm:grid-cols-2">
              <p className="text-base font-semibold sm:col-span-2">{student.data?.full_name}</p>
              <p className="text-muted-foreground">Admission: {student.data?.admission_number}</p>
              <p className="text-muted-foreground">Class: {student.data?.classes?.name ?? "—"}</p>
              <p className="text-muted-foreground">Date of birth: {student.data?.dob ?? "—"}</p>
              <p className="text-muted-foreground">Gender: {student.data?.gender ?? "—"}</p>
              <p className="text-muted-foreground">
                Guardian: {student.data?.guardian_name ?? "—"} {student.data?.guardian_phone ?? ""}
              </p>
            </CardContent>
          </Card>

          {(visits.data ?? []).length === 0 ? (
            <EmptyState message="No visits recorded for this student." />
          ) : (
            (visits.data ?? []).map((v) => (
              <Card key={v.id} className="surface-card">
                <CardContent className="space-y-1 pt-6 text-sm">
                  <p className="font-medium">{v.date}</p>
                  <p><span className="text-muted-foreground">Symptoms:</span> {v.symptoms || "—"}</p>
                  <p><span className="text-muted-foreground">Diagnosis:</span> {v.diagnosis || "—"}</p>
                  <p><span className="text-muted-foreground">Treatment:</span> {v.treatment || "—"}</p>
                  {v.notes ? <p><span className="text-muted-foreground">Notes:</span> {v.notes}</p> : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
