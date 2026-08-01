import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createUserAccount } from "@/lib/admin.functions";
import { AdminOnly } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/admin/parents")({
  component: () => (
    <AdminOnly>
      <ParentsPage />
    </AdminOnly>
  ),
});

type LinkRow = {
  id: string;
  relationship: string | null;
  parent_id: string;
  student_id: string;
  users: { full_name: string; email: string } | null;
  students: { full_name: string; admission_number: string } | null;
};

const emptyParent = { email: "", password: "", full_name: "", phone: "" };

function ParentsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...emptyParent });
  const [parentId, setParentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [relationship, setRelationship] = useState("guardian");
  const createAccount = useServerFn(createUserAccount);

  const parents = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone")
        .eq("role", "parent")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, class_id, classes(name)")
        .order("admission_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const links = useQuery({
    queryKey: ["parent_student_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_student_links")
        .select("id, relationship, parent_id, student_id, users(full_name, email), students(full_name, admission_number)");
      if (error) throw error;
      return (data ?? []) as unknown as LinkRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      createAccount({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone || null,
          role: "parent" as const,
        },
      }),
    onSuccess: () => {
      toast.success("Parent account created");
      setForm({ ...emptyParent });
      void qc.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const link = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("parent_student_links")
        .insert({ parent_id: parentId, student_id: studentId, relationship });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parent linked to student");
      setStudentId("");
      void qc.invalidateQueries({ queryKey: ["parent_student_links"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parent_student_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link removed");
      void qc.invalidateQueries({ queryKey: ["parent_student_links"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Parents"
        description="Create parent accounts and link them to their children."
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">New parent account</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <Input
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={create.isPending}>
                Create parent
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Link parent to student</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!parentId || !studentId) {
                  toast.error("Pick a parent and a student");
                  return;
                }
                link.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Parent</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {(parents.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {(students.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} · {s.admission_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={link.isPending}>
                Link
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {(links.data ?? []).length === 0 ? (
        <EmptyState message="No parent-student links yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(links.data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.users?.full_name ?? l.users?.email}</TableCell>
                  <TableCell>
                    {l.students?.full_name} · {l.students?.admission_number}
                  </TableCell>
                  <TableCell>{l.relationship ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => unlink.mutate(l.id)}>
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
