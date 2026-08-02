import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { StudentFile } from "@/components/student-file";

export const Route = createFileRoute("/_authenticated/me/")({
  head: () => ({
    meta: [
      { title: "My school file — Lycée Manager" },
      { name: "description", content: "Your results, attendance, discipline record and fee status in one place." },
      { property: "og:title", content: "My school file — Lycée Manager" },
      { property: "og:description", content: "Your results, attendance, discipline record and fee status in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["student"]} message="This portal is for students.">
      <MyFilePage />
    </RequireRole>
  ),
});

function MyFilePage() {
  const { profile } = useAuth();

  const me = useQuery({
    queryKey: ["my-student-record", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, class_id, classes(name)")
        .eq("user_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        full_name: string;
        admission_number: string;
        class_id: string | null;
        classes: { name: string } | null;
      } | null;
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="My school file"
        description={
          me.data
            ? `${me.data.admission_number}${me.data.classes?.name ? ` · ${me.data.classes.name}` : ""}`
            : "Your results, attendance, discipline and fees."
        }
      />
      {me.isLoading ? (
        <EmptyState message="Loading…" />
      ) : !me.data ? (
        <EmptyState message="Your account isn't linked to a student record yet. Ask the school office." />
      ) : (
        <StudentFile studentId={me.data.id} classId={me.data.class_id} />
      )}
    </div>
  );
}
