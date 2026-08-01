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

export const Route = createFileRoute("/_authenticated/admin/students")({
  component: () => (
    <AdminOnly>
      <StudentsPage />
    </AdminOnly>
  ),
});

type StudentRow = {
  id: string;
  full_name: string;
  admission_number: string;
  class_id: string | null;
  dob: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  classes: { name: string } | null;
};

const empty = {
  id: "",
  full_name: "",
  admission_number: "",
  class_id: "",
  dob: "",
  gender: "",
  guardian_name: "",
  guardian_phone: "",
};

function StudentsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });

  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, full_name, admission_number, class_id, dob, gender, guardian_name, guardian_phone, classes(name)",
        )
        .order("admission_number");
      if (error) throw error;
      return (data ?? []) as unknown as StudentRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name,
        admission_number: form.admission_number,
        class_id: form.class_id || null,
        dob: form.dob || null,
        gender: form.gender || null,
        guardian_name: form.guardian_name || null,
        guardian_phone: form.guardian_phone || null,
      };
      const { error } = form.id
        ? await supabase.from("students").update(payload).eq("id", form.id)
        : await supabase.from("students").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Student updated" : "Student registered");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Students" description="Register students and assign them to a class." />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Full name</Label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Admission number</Label>
              <Input
                required
                value={form.admission_number}
                onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={form.class_id || "none"}
                onValueChange={(v) => setForm({ ...form, class_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(classes.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.gender || "unset"}
                onValueChange={(v) => setForm({ ...form, gender: v === "unset" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Guardian name</Label>
              <Input
                value={form.guardian_name}
                onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Guardian phone</Label>
              <Input
                value={form.guardian_phone}
                onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" disabled={save.isPending}>
                {form.id ? "Save changes" : "Register student"}
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

      {(students.data ?? []).length === 0 ? (
        <EmptyState message="No students registered yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adm. no.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(students.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.admission_number}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.classes?.name ?? "—"}</TableCell>
                  <TableCell>
                    {s.guardian_name ?? "—"}
                    {s.guardian_phone ? ` · ${s.guardian_phone}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          id: s.id,
                          full_name: s.full_name,
                          admission_number: s.admission_number,
                          class_id: s.class_id ?? "",
                          dob: s.dob ?? "",
                          gender: s.gender ?? "",
                          guardian_name: s.guardian_name ?? "",
                          guardian_phone: s.guardian_phone ?? "",
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
