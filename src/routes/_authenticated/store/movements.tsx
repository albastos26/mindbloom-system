import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RequireRole } from "@/components/role-guard";
import { PageHeader, EmptyState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { today } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/store/movements")({
  head: () => ({
    meta: [
      { title: "Stock movements — Lycée Manager" },
      { name: "description", content: "Record goods coming into and going out of the school store." },
      { property: "og:title", content: "Stock movements — Lycée Manager" },
      { property: "og:description", content: "Record goods coming into and going out of the school store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["storekeeper"]} message="This page is for the storekeeper.">
      <MovementsPage />
    </RequireRole>
  ),
});

type Item = { id: string; name: string; quantity_on_hand: number; unit: string | null };
type Tx = { id: string; item_id: string; type: string; quantity: number; date: string; reason: string | null };

const empty = { item_id: "", type: "in", quantity: "", date: today(), reason: "" };

function MovementsPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({ ...empty });

  const items = useQuery({
    queryKey: ["stock-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, name, quantity_on_hand, unit")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const txs = useQuery({
    queryKey: ["stock-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("id, item_id, type, quantity, date, reason")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tx[];
    },
  });

  const itemById = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data]);

  const save = useMutation({
    mutationFn: async () => {
      const item = itemById.get(form.item_id);
      if (!item) throw new Error("Pick an item");
      const qty = Number(form.quantity || 0);
      if (qty <= 0) throw new Error("Quantity must be greater than zero");
      const next = form.type === "in" ? Number(item.quantity_on_hand) + qty : Number(item.quantity_on_hand) - qty;
      if (next < 0) throw new Error("Not enough stock on hand");

      const { error } = await supabase.from("stock_transactions").insert({
        item_id: form.item_id,
        type: form.type,
        quantity: qty,
        date: form.date,
        reason: form.reason || null,
        recorded_by: profile?.id ?? null,
      });
      if (error) throw error;

      const { error: upErr } = await supabase
        .from("stock_items")
        .update({ quantity_on_hand: next })
        .eq("id", form.item_id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast.success("Movement recorded");
      setForm({ ...empty });
      void qc.invalidateQueries({ queryKey: ["stock-transactions"] });
      void qc.invalidateQueries({ queryKey: ["stock-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Stock movements" description="Every entry and exit updates the quantity on hand." />

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
              <Label>Item</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {(items.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} · {i.quantity_on_hand} {i.unit ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock in</SelectItem>
                  <SelectItem value="out">Stock out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                required
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Reason</Label>
              <Input
                placeholder="Delivery, classroom issue, damage…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={save.isPending}>
                Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {(txs.data ?? []).length === 0 ? (
        <EmptyState message="No stock movements yet." />
      ) : (
        <Card className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(txs.data ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell className="font-medium">{itemById.get(t.item_id)?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.type === "in" ? "secondary" : "outline"}>
                      {t.type === "in" ? "In" : "Out"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{t.reason || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
