import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listAdminLevels, createLevelFromBase64, publishLevel, deleteLevel } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, CheckCircle2, Trash2, Wand2, Sparkles } from "lucide-react";
import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const q = useQuery({ queryKey: ["adminLevels"], queryFn: () => listAdminLevels() });
  const pub = useMutation({
    mutationFn: (v: { id: string; published: boolean }) => publishLevel({ data: v }),
    onSuccess: () => q.refetch(),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteLevel({ data: { id } }),
    onSuccess: () => q.refetch(),
  });

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Admin · Levels</h1>
        </div>
        <NewLevelCard onCreated={() => q.refetch()} />
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data?.map((lvl) => (
            <div key={lvl.id} className="rounded-3xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{lvl.title}</p>
                  <p className="text-xs text-muted-foreground">World {lvl.world} · Difficulty {lvl.difficulty}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${lvl.published ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                  {lvl.published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/admin/levels/$id" params={{ id: lvl.id }}>
                  <Button size="sm" variant="secondary">Mark differences</Button>
                </Link>
                <Button size="sm" onClick={() => pub.mutate({ id: lvl.id, published: !lvl.published })}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> {lvl.published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete level?")) del.mutate(lvl.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {q.data?.length === 0 && <p className="col-span-full text-center text-muted-foreground">No levels yet — create one!</p>}
        </div>
      </main>
    </div>
  );
}

function NewLevelCard({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("Cozy Cat Café");
  const [scene, setScene] = useState("A cozy cat café interior with three cats, a barista, a window with plants, a bookshelf, a hanging clock, a chalkboard menu, warm afternoon light");
  const [diffs, setDiffs] = useState("change the barista's apron color; remove one plant from the window; add a small bird outside; swap the chalkboard menu text; change the clock hands position");
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const create = useMutation({
    mutationFn: (v: any) => createLevelFromBase64({ data: v }),
    onSuccess: (lvl) => { toast.success(`Level created: ${lvl.title}. Now mark the differences.`); onCreated(); setA(null); setB(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function genOne(variant: "a" | "b") {
    setBusy(true);
    setBusyLabel(`Generating image ${variant.toUpperCase()}…`);
    try {
      const res = await fetch("/api/generate-level-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene, variant, differencesHint: variant === "b" ? diffs : undefined }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const parser = createParser({
        onEvent(ev) {
          try {
            const p = JSON.parse(ev.data);
            if (ev.event === "image_generation.partial_image" || ev.event === "image_generation.completed") {
              const dataUrl = `data:image/png;base64,${p.b64_json}`;
              flushSync(() => { variant === "a" ? setA(dataUrl) : setB(dataUrl); });
            }
          } catch {}
        },
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) { const { value, done } = await reader.read(); if (done) break; parser.feed(value); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  }

  function submit() {
    if (!a || !b) return toast.error("Generate both images first");
    create.mutate({
      title, world: 1, difficulty: 1,
      imageA_b64: a.split(",")[1],
      imageB_b64: b.split(",")[1],
    });
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" /> New AI level</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Scene prompt</Label><Textarea rows={3} value={scene} onChange={(e) => setScene(e.target.value)} /></div>
          <div><Label>Differences (comma-sep, 5 items)</Label><Textarea rows={3} value={diffs} onChange={(e) => setDiffs(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => genOne("a")} disabled={busy}><Wand2 className="mr-1 h-4 w-4" /> Generate A</Button>
            <Button size="sm" onClick={() => genOne("b")} disabled={busy || !a}><Wand2 className="mr-1 h-4 w-4" /> Generate B</Button>
            <Button size="sm" variant="secondary" onClick={submit} disabled={busy || !a || !b || create.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Save level
            </Button>
          </div>
          {busy && <p className="text-xs text-muted-foreground">{busyLabel}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Preview src={a} label="A" />
          <Preview src={b} label="B" />
        </div>
      </div>
    </div>
  );
}

function Preview({ src, label }: { src: string | null; label: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted">
      {src ? <img src={src} className="h-full w-full object-cover" alt={label} /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">{label}</div>}
    </div>
  );
}
