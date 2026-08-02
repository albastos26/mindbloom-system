import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Boxes, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STOCK_CATEGORIES } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/store/")({
  head: () => ({
    meta: [
      { title: "Stock items — Lycée Manager" },
      { name: "description", content: "Manage school supplies, quantities on hand and reorder thresholds." },
      { property: "og:title", content: "Stock items — Lycée Manager" },
      { property: "og:description", content: "Manage school supplies, quantities on hand and reorder thresholds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["storekeeper"]} message="This page is for the storekeeper.">
      <StorePage />
    </RequireRole>
  ),
});

type Item = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  quantity_on_hand: number;
  reorder_threshold: number;
};

const empty = { id: "", name: "", category: STOCK_CATEGORIES[0] as string, unit: "unit", reorder_threshold: "0" };

function StorePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });
  const [search, setSearch] = useState("");

  const items = useQuery({
    queryKey: ["stock-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, name, category, unit, quantity_on_hand, reorder_threshold")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        category: form.category,
        unit: form.unit || null,
        reorder_threshold: Number(form.reorder_threshold || 0),
      };
      const { error } = form.id
        ? await supabase.from("stock_items").update(payload).eq("id", form.id)
        : await supabase.from("stock_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Item updated" : "Item added");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["stock-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (items.data ?? []).filter((i) =>
    search ? i.name.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const low = (items.data ?? []).filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_threshold));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Stock items"
        description="The school store catalogue with live quantities."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/store/movements">Movements</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/store/reports">Reports</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Items" value={(items.data ?? []).length} icon={Package} />
        <StatCard
          label="Units on hand"
          value={(items.data ?? []).reduce((s, i) => s + Number(i.quantity_on_hand), 0)}
          icon={Boxes}
        />
        <StatCard label="Low stock" value={low.length} hint="At or below threshold" icon={AlertTriangle} />
      </div>

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
              <Label>Item name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reorder threshold</Label>
              <Input
                type="number"
                min="0"
                value={form.reorder_threshold}
                onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
              />
            </div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" disabled={save.isPending}>
                {form.id ? "Save changes" : "Add item"}
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

      <div className="mb-4">
        <Input placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No stock items yet." />
      ) : (
        <Card className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => {
                const isLow = Number(i.quantity_on_hand) <= Number(i.reorder_threshold);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.name}
                      {isLow ? (
                        <Badge variant="destructive" className="ml-2">
                          Low
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">{i.category ?? "—"}</TableCell>
                    <TableCell>{i.unit ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.quantity_on_hand}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.reorder_threshold}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: i.id,
                            name: i.name,
                            category: i.category ?? STOCK_CATEGORIES[0],
                            unit: i.unit ?? "",
                            reorder_threshold: String(i.reorder_threshold),
                          })
                        }
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
