import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_NAV, isAdminRole, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function useCounts(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard-counts"],
    enabled,
    queryFn: async () => {
      const [students, classes, subjects, staff] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: students.count ?? 0,
        classes: classes.count ?? 0,
        subjects: subjects.count ?? 0,
        users: staff.count ?? 0,
      };
    },
  });
}

function DashboardPage() {
  const { profile } = useAuth();
  const role = (profile?.role ?? "student") as AppRole;
  const admin = isAdminRole(role);
  const { data: counts } = useCounts(admin);

  const teacherLoad = useQuery({
    queryKey: ["teacher-load", profile?.id],
    enabled: role === "teacher" && !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, classes(name), subjects(name)")
        .eq("teacher_id", profile!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const quickLinks = ROLE_NAV[role].flatMap((g) => g.items).filter((i) => i.to !== "/dashboard");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome, ${profile?.full_name || "there"}`}
        description={`${ROLE_LABELS[role]} dashboard`}
      />

      {admin ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Students", value: counts?.students },
            { label: "Classes", value: counts?.classes },
            { label: "Subjects", value: counts?.subjects },
            { label: "Accounts", value: counts?.users },
          ].map((s) => (
            <Card key={s.label} className="surface-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{s.value ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {role === "teacher" ? (
        <Card className="surface-card mb-8">
          <CardHeader>
            <CardTitle className="text-base">My teaching load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(teacherLoad.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No class-subject assignments yet. Ask the head of studies to assign you.
              </p>
            ) : (
              (teacherLoad.data ?? []).map((row) => {
                const r = row as unknown as {
                  id: string;
                  classes: { name: string } | null;
                  subjects: { name: string } | null;
                };
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-sm">
                      {r.classes?.name} · {r.subjects?.name}
                    </span>
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/teach/$csId" params={{ csId: r.id }}>
                        Open
                      </Link>
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickLinks.map((item) => (
            <Button key={item.title + item.to} asChild variant="outline" size="sm">
              <Link to={item.to as never}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
