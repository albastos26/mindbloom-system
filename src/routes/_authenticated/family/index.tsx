import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { StudentFile } from "@/components/student-file";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/family/")({
  head: () => ({
    meta: [
      { title: "Parent portal — Lycée Manager" },
      { name: "description", content: "Follow your children's results, attendance, discipline and school fees." },
      { property: "og:title", content: "Parent portal — Lycée Manager" },
      { property: "og:description", content: "Follow your children's results, attendance, discipline and school fees." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["parent"]} message="This portal is for parents and guardians.">
      <FamilyPage />
    </RequireRole>
  ),
});

type Child = {
  id: string;
  full_name: string;
  admission_number: string;
  class_id: string | null;
  relationship: string;
  class_name: string | null;
};

function FamilyPage() {
  const { profile } = useAuth();
  const [selected, setSelected] = useState<string>("");

  const children = useQuery({
    queryKey: ["my-children", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_student_links")
        .select("relationship, students(id, full_name, admission_number, class_id, classes(name))")
        .eq("parent_id", profile!.id);
      if (error) throw error;
      type Row = {
        relationship: string;
        students: {
          id: string;
          full_name: string;
          admission_number: string;
          class_id: string | null;
          classes: { name: string } | null;
        } | null;
      };
      return ((data ?? []) as unknown as Row[])
        .filter((r) => r.students)
        .map<Child>((r) => ({
          id: r.students!.id,
          full_name: r.students!.full_name,
          admission_number: r.students!.admission_number,
          class_id: r.students!.class_id,
          relationship: r.relationship,
          class_name: r.students!.classes?.name ?? null,
        }));
    },
  });

  useEffect(() => {
    if (!selected && (children.data ?? []).length > 0) setSelected(children.data![0]!.id);
  }, [children.data, selected]);

  const child = (children.data ?? []).find((c) => c.id === selected);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="My children"
        description="Results, attendance, discipline and fees for each child linked to your account."
      />

      {(children.data ?? []).length === 0 ? (
        <EmptyState message="No children are linked to your account yet. Ask the school office to link them." />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {(children.data ?? []).map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={c.id === selected ? "default" : "outline"}
                onClick={() => setSelected(c.id)}
              >
                {c.full_name}
                <span className="ml-2 text-xs opacity-70">{c.class_name ?? c.admission_number}</span>
              </Button>
            ))}
          </div>
          <StudentFile studentId={child?.id} classId={child?.class_id ?? null} />
        </>
      )}
    </div>
  );
}
