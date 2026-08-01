import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/assignments")({
  component: () => (
    <AdminOnly>
      <AssignmentsPage />
    </AdminOnly>
  ),
});

type AssignmentRow = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  classes: { name: string } | null;
  subjects: { name: string; code: string } | null;
  users: { full_name: string; email: string } | null;
};

function AssignmentsPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, code").order("name");
      if (error) throw error;
      return data ?? [];
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
  const assignments = useQuery({
    queryKey: ["class_subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subjects")
        .select("id, class_id, subject_id, teacher_id, classes(name), subjects(name, code), users(full_name, email)");
      if (error) throw error;
      return (data ?? []) as unknown as AssignmentRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("class_subjects").insert({
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment saved");
      setSubjectId("");
      setTeacherId("");
      void qc.invalidateQueries({ queryKey: ["class_subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeTeacher = useMutation({
    mutationFn: async ({ id, teacher }: { id: string; teacher: string }) => {
      const { error } = await supabase
        .from("class_subjects")
        .update({ teacher_id: teacher || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teacher updated");
      void qc.invalidateQueries({ queryKey: ["class_subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment removed");
      void qc.invalidateQueries({ queryKey: ["class_subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Teacher assignments"
        description="Attach a subject to a class and give it a teacher."
      />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!classId || !subjectId) {
                toast.error("Pick a class and a subject");
                return;
              }
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {(classes.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {(subjects.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select
                value={teacherId || "none"}
                onValueChange={(v) => setTeacherId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(teachers.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name || t.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={create.isPending}>
                Assign
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {(assignments.data ?? []).length === 0 ? (
        <EmptyState message="No class-subject assignments yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assignments.data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.classes?.name}</TableCell>
                  <TableCell>{a.subjects?.name}</TableCell>
                  <TableCell>
                    <Select
                      value={a.teacher_id ?? "none"}
                      onValueChange={(v) =>
                        changeTeacher.mutate({ id: a.id, teacher: v === "none" ? "" : v })
                      }
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {(teachers.data ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name || t.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)}>
                      Remove
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
