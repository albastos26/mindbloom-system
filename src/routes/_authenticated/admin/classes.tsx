import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/classes")({
  component: () => (
    <AdminOnly>
      <ClassesPage />
    </AdminOnly>
  ),
});

type ClassRow = {
  id: string;
  name: string;
  level: string;
  academic_year: string;
  head_teacher_id: string | null;
};

const empty = { id: "", name: "", level: "", academic_year: "", head_teacher_id: "" };

function ClassesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });

  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, level, academic_year, head_teacher_id")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
  });

  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "teacher")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        level: form.level,
        academic_year: form.academic_year,
        head_teacher_id: form.head_teacher_id || null,
      };
      const { error } = form.id
        ? await supabase.from("classes").update(payload).eq("id", form.id)
        : await supabase.from("classes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Class updated" : "Class created");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const teacherName = (id: string | null) =>
    teachers.data?.find((t) => t.id === id)?.full_name ?? "—";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Classes" description="Create classes and assign a head teacher." />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                placeholder="Form 4A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Input
                placeholder="Form 4"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Academic year</Label>
              <Input
                placeholder="2026-2027"
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Head teacher</Label>
              <Select
                value={form.head_teacher_id || "none"}
                onValueChange={(v) => setForm({ ...form, head_teacher_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(teachers.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name || t.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" disabled={save.isPending}>
                {form.id ? "Save changes" : "Create class"}
              </Button>
              {form.id ? (
                <Button type="button" variant="ghost" onClick={() => setForm({ ...empty })}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {(classes.data ?? []).length === 0 ? (
        <EmptyState message="No classes yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Academic year</TableHead>
                <TableHead>Head teacher</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(classes.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.level || "—"}</TableCell>
                  <TableCell>{c.academic_year || "—"}</TableCell>
                  <TableCell>{teacherName(c.head_teacher_id)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          id: c.id,
                          name: c.name,
                          level: c.level,
                          academic_year: c.academic_year,
                          head_teacher_id: c.head_teacher_id ?? "",
                        })
                      }
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
