import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminRole } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminOnly({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading && !profile) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (!isAdminRole(profile?.role)) {
    return (
      <Card className="surface-card mx-auto max-w-lg">
        <CardContent className="py-12 text-center">
          <h1 className="page-title">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only the director and head of studies can open this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export function TeacherOnly({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading && !profile) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (profile?.role !== "teacher" && !isAdminRole(profile?.role)) {
    return (
      <Card className="surface-card mx-auto max-w-lg">
        <CardContent className="py-12 text-center">
          <h1 className="page-title">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">This page is for teaching staff.</p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
