import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TeacherOnly } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/teach/")({
  component: () => (
    <TeacherOnly>
      <TeachIndex />
    </TeacherOnly>
  ),
});

type Row = {
  id: string;
  classes: { name: string; level: string } | null;
  subjects: { name: string; code: string } | null;
};

function TeachIndex() {
  const { profile } = useAuth();

  const load = useQuery({
    queryKey: ["my-class-subjects", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, classes(name, level), subjects(name, code)")
        .eq("teacher_id", profile!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My classes"
        description="Open a class to take attendance, create evaluations and enter grades."
      />

      {load.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (load.data ?? []).length === 0 ? (
        <EmptyState message="You have no class-subject assignments yet. Ask the head of studies to assign you." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(load.data ?? []).map((cs) => (
            <Link key={cs.id} to="/teach/$csId" params={{ csId: cs.id }} className="group">
              <Card className="surface-card h-full transition-colors group-hover:border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{cs.subjects?.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{cs.classes?.name}</span>
                  <Badge variant="secondary">{cs.subjects?.code}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
