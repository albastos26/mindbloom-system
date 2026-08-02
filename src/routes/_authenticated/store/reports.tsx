import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/role-guard";
import { PageHeader } from "@/components/page";
import { BarChartCard, PieChartCard } from "@/components/simple-charts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sumBy } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/store/reports")({
  head: () => ({
    meta: [
      { title: "Store reports — Lycée Manager" },
      { name: "description", content: "Stock levels by category, consumption and low-stock alerts." },
      { property: "og:title", content: "Store reports — Lycée Manager" },
      { property: "og:description", content: "Stock levels by category, consumption and low-stock alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole roles={["storekeeper"]} message="This page is for the storekeeper.">
      <StoreReports />
    </RequireRole>
  ),
});

function StoreReports() {
  const data = useQuery({
    queryKey: ["store-reports"],
    queryFn: async () => {
      const [items, txs] = await Promise.all([
        supabase.from("stock_items").select("id, name, category, quantity_on_hand, reorder_threshold, unit"),
        supabase.from("stock_transactions").select("item_id, type, quantity"),
      ]);
      if (items.error) throw items.error;
      if (txs.error) throw txs.error;
      return {
        items: (items.data ?? []) as {
          id: string;
          name: string;
          category: string | null;
          quantity_on_hand: number;
          reorder_threshold: number;
          unit: string | null;
        }[],
        txs: (txs.data ?? []) as { item_id: string; type: string; quantity: number }[],
      };
    },
  });

  const items = data.data?.items ?? [];
  const txs = data.data?.txs ?? [];

  const byCategory = sumBy(items, (i) => i.category ?? "other", (i) => Number(i.quantity_on_hand));
  const consumption = sumBy(
    txs.filter((t) => t.type === "out"),
    (t) => items.find((i) => i.id === t.item_id)?.name ?? "—",
    (t) => Number(t.quantity),
  ).slice(0, 8);
  const low = items.filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_threshold));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader title="Store reports" description="Where stock sits and what is being consumed." />

      <div className="grid gap-6 lg:grid-cols-2">
        <PieChartCard title="Quantity on hand by category" data={byCategory} />
        <BarChartCard title="Most consumed items" data={consumption} />
      </div>

      <Card className="surface-card overflow-x-auto">
        <CardHeader>
          <CardTitle className="text-base">Low stock alerts</CardTitle>
        </CardHeader>
        {low.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Everything is above its reorder threshold.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {low.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="capitalize">{i.category ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.quantity_on_hand} {i.unit ?? ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{i.reorder_threshold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
