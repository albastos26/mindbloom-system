import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminRole, type AppRole } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Denied({ message }: { message: string }) {
  return (
    <Card className="surface-card mx-auto max-w-lg">
      <CardContent className="py-12 text-center">
        <h1 className="page-title">Restricted area</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function RequireRole({
  roles,
  children,
  allowAdmin = true,
  message = "You do not have access to this page.",
}: {
  roles: AppRole[];
  children: ReactNode;
  allowAdmin?: boolean;
  message?: string;
}) {
  const { profile, loading } = useAuth();

  if (loading && !profile) return <Skeleton className="h-64 w-full rounded-xl" />;

  const role = profile?.role as AppRole | undefined;
  const ok = (role && roles.includes(role)) || (allowAdmin && isAdminRole(role));
  if (!ok) return <Denied message={message} />;

  return <>{children}</>;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={[]} message="Only the director and head of studies can open this page.">
      {children}
    </RequireRole>
  );
}

export function TeacherOnly({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["teacher"]} message="This page is for teaching staff.">
      {children}
    </RequireRole>
  );
}
