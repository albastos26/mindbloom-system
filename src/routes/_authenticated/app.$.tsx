import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/$")({
  component: ComingSoon,
});

function ComingSoon() {
  const { _splat } = Route.useParams();
  const title = (_splat ?? "")
    .split("/")
    .pop()!
    .replace(/-/g, " ")
    .replace(/^\w/, (c: string) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="surface-card">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Construction className="h-6 w-6" />
          </span>
          <div>
            <h1 className="page-title">{title || "Coming soon"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This module is part of the roadmap and isn't built yet. The navigation, roles and data
              model are already in place for it.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/dashboard">Back to overview</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
