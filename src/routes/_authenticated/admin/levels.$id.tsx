import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getAdminLevel, setDifferences, publishLevel } from "@/lib/admin.functions";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/levels/$id")({
  component: LevelEditor,
});

type Diff = { x: number; y: number; radius: number; label?: string | null };

function LevelEditor() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["adminLevel", id], queryFn: () => getAdminLevel({ data: { id } }) });
  const [diffs, setDiffs] = useState<Diff[]>([]);
  useEffect(() => { if (q.data?.differences) setDiffs(q.data.differences.map((d) => ({ x: Number(d.x), y: Number(d.y), radius: Number(d.radius) }))); }, [q.data?.differences]);

  const saveMut = useMutation({
    mutationFn: () => setDifferences({ data: { level_id: id, diffs } }),
    onSuccess: () => toast.success(`Saved ${diffs.length} differences`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const pub = useMutation({
    mutationFn: () => publishLevel({ data: { id, published: !q.data?.level.published } }),
    onSuccess: () => { toast.success("Publish state changed"); q.refetch(); },
  });

  function onImageClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDiffs((prev) => [...prev, { x, y, radius: 0.07 }]);
  }
  function removeAt(i: number) { setDiffs((prev) => prev.filter((_, idx) => idx !== i)); }

  if (q.isLoading || !q.data) return <div className="min-h-dvh bg-background"><AppHeader /><p className="p-6">Loading…</p></div>;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-2xl font-black">{q.data.level.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">Tap on image A to mark each difference (aim for exactly 5). Click a mark to remove it.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative select-none overflow-hidden rounded-3xl border border-border bg-muted" style={{ aspectRatio: "4/3" }} onClick={onImageClick}>
            <img src={q.data.signedA} className="pointer-events-none absolute inset-0 h-full w-full object-cover" alt="A" />
            {diffs.map((d, i) => (
              <span key={i}
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-4 border-warning bg-warning/30"
                style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${d.radius * 2 * 100}%`, aspectRatio: "1" }} />
            ))}
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-muted" style={{ aspectRatio: "4/3" }}>
            <img src={q.data.signedB} className="pointer-events-none absolute inset-0 h-full w-full object-cover" alt="B" />
            {diffs.map((d, i) => (
              <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-warning/70" style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${d.radius * 2 * 100}%`, aspectRatio: "1" }} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="mr-1 h-4 w-4" /> Save differences ({diffs.length})</Button>
          <Button variant="secondary" onClick={() => pub.mutate()}><CheckCircle2 className="mr-1 h-4 w-4" /> {q.data.level.published ? "Unpublish" : "Publish"}</Button>
          <Button variant="ghost" onClick={() => setDiffs([])}><Trash2 className="mr-1 h-4 w-4" /> Clear</Button>
        </div>
      </main>
    </div>
  );
}
