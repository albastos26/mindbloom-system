import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lycée Manager — Secondary School Management" },
      {
        name: "description",
        content:
          "One platform for directors, teachers, parents and students: classes, grades, attendance, discipline, health, fees and stock.",
      },
      { property: "og:title", content: "Lycée Manager — Secondary School Management" },
      {
        property: "og:description",
        content: "Run your secondary school from a single, role-aware dashboard.",
      },
    ],
  }),
  component: Landing,
});

const highlights = [
  { icon: GraduationCap, title: "Students & classes", text: "Enrolment, class lists and academic years." },
  { icon: BookOpen, title: "Teaching", text: "Attendance, evaluations and grade entry per session." },
  { icon: ShieldCheck, title: "Discipline & health", text: "Incident tracking and infirmary records." },
  { icon: Wallet, title: "Finance & store", text: "Fees, payments, expenses and stock control." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold">Lycée Manager</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Secondary school management
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Every role in your school, one connected system.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Directors, heads of studies, discipline, nurses, teachers, bursars, storekeepers,
            parents and students each get a dashboard built for what they actually do.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h) => (
            <Card key={h.title} className="surface-card">
              <CardContent className="pt-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <h.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{h.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
