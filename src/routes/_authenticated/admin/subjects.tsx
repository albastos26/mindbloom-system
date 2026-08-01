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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  component: () => (
    <AdminOnly>
      <SubjectsPage />
    </AdminOnly>
  ),
});

type SubjectRow = { id: string; name: string; code: string };
const empty = { id: "", name: "", code: "" };

function SubjectsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, code").order("name");
      if (error) throw error;
      return (data ?? []) as SubjectRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, code: form.code.toUpperCase() };
      const { error } = form.id
        ? await supabase.from("subjects").update(payload).eq("id", form.id)
        : await supabase.from("subjects").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Subject updated" : "Subject created");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Subjects" description="The subject catalogue taught in the school." />

      <Card className="surface-card mb-8">
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Subject name</Label>
              <Input
                required
                placeholder="Mathematics"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                required
                placeholder="MATH"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" disabled={save.isPending}>
                {form.id ? "Save changes" : "Add subject"}
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

      {(subjects.data ?? []).length === 0 ? (
        <EmptyState message="No subjects yet." />
      ) : (
        <Card className="surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subjects.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setForm(s)}>
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
