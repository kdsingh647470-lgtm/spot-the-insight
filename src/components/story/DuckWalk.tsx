import { useEffect, useMemo, useRef, useState } from "react";
import { playBeep } from "@/lib/audio";

// ---------------------------------------------------------------------------
// DuckWalk — the star of the post-level transition.
//
// Renders inside a parent SVG (viewBox 0 0 320 96). Given a quadratic Bézier
// curve endpoint set, it drives a live walking-duck animation via
// requestAnimationFrame: real path following with tangent-based rotation, a
// bobbing body, alternating feet, wing/head/magnifying-glass motion, dust
// puffs on each footstep, and a celebration burst at the destination.
// ---------------------------------------------------------------------------

export type DuckWalkProps = {
  /** Start point in SVG coords. */
  p0: { x: number; y: number };
  /** Control point in SVG coords. */
  p1: { x: number; y: number };
  /** End point in SVG coords. */
  p2: { x: number; y: number };
  /** Fires once when the celebration finishes so the parent can reveal Play. */
  onFinished?: () => void;
  /** Total walk duration in ms. Celebration adds ~1000ms. */
  durationMs?: number;
};

// easeInOutCubic — smooth accel + decel so nothing looks robotic.
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Sample a quadratic Bézier at parameter t.
function bezier(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, t: number) {
  const mt = 1 - t;
  const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
  const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
  const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

type Dust = { id: number; x: number; y: number };

export function DuckWalk({ p0, p1, p2, onFinished, durationMs = 3800 }: DuckWalkProps) {
  const [pos, setPos] = useState(() => bezier(p0, p1, p2, 0));
  const [phase, setPhase] = useState<"walk" | "celebrate" | "done">("walk");
  const [dust, setDust] = useState<Dust[]>([]);
  const [blink, setBlink] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastStepRef = useRef(0);
  const dustIdRef = useRef(0);

  // Idle blink loop — a subtle sign of life during walk + celebration.
  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  // Main walk loop. Runs a single easing pass from 0→1 across durationMs
  // then transitions to celebrate (~1s) and finally done.
  useEffect(() => {
    let cancelled = false;
    const step = (now: number) => {
      if (cancelled) return;
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = ease(t);
      const p = bezier(p0, p1, p2, eased);
      setPos(p);

      // Emit a dust puff every ~360ms of eased travel (footstep cadence).
      const stepPeriod = 360;
      const steps = Math.floor(elapsed / stepPeriod);
      if (steps > lastStepRef.current) {
        lastStepRef.current = steps;
        const id = ++dustIdRef.current;
        setDust((d) => [...d.slice(-4), { id, x: p.x, y: p.y + 5 }]);
        window.setTimeout(() => setDust((d) => d.filter((x) => x.id !== id)), 700);
        playBeep(steps % 2 === 0 ? 620 : 540, 0.045, "triangle");
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setPhase("celebrate");
        playBeep(880, 0.12, "triangle");
        window.setTimeout(() => playBeep(1175, 0.14, "triangle"), 120);
        window.setTimeout(() => playBeep(1568, 0.18, "sine"), 260);
        window.setTimeout(() => {
          setPhase("done");
          onFinished?.();
        }, 1050);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alternating foot cycle at ~2.8Hz — matches perceived footstep cadence.
  const cycleT = (typeof performance !== "undefined" ? performance.now() : 0) / 1000;
  const walkPhase = pos.x + pos.y * 0.7; // stable pseudo-time from position
  const bob = Math.sin(walkPhase * 0.9) * 1.2;
  const wing = Math.sin(walkPhase * 0.9) * 18;
  const headTilt = Math.sin(walkPhase * 0.9 + 0.6) * 3;
  const glassSwing = Math.sin(walkPhase * 0.45) * 14;
  const footA = Math.sin(walkPhase * 0.9) > 0 ? -1.5 : 1.5;
  const footB = -footA;

  // Face the direction of travel (mirror when walking right→left).
  const facingRight = pos.angle > -90 && pos.angle < 90;
  const bodyRotate = Math.max(-8, Math.min(8, pos.angle * 0.15));

  // Celebration jump: single crisp arc on the destination marker.
  const jump = useMemo(() => {
    if (phase !== "celebrate") return 0;
    return -1;
  }, [phase]);

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Ambient dust puffs left behind footsteps */}
      {dust.map((d) => (
        <circle
          key={d.id}
          cx={d.x}
          cy={d.y}
          r={2.2}
          className="fill-muted-foreground/50"
          style={{ animation: "dust-puff 700ms ease-out forwards" }}
        />
      ))}

      <g transform={`translate(${pos.x} ${pos.y + bob})`}>
        {/* Soft ground shadow that follows underneath */}
        <ellipse cx={0} cy={7} rx={7} ry={1.6} className="fill-black/25" />

        <g
          transform={`${facingRight ? "" : "scale(-1,1)"} rotate(${bodyRotate}) ${
            phase === "celebrate" ? `translate(0 ${Math.sin(cycleT * 8) * 3 * jump})` : ""
          }`}
        >
          {/* Feet — alternate up/down for a real walk cycle */}
          <ellipse cx={-2.4} cy={6 + footA * 0.6} rx={1.8} ry={1.1} className="fill-warning" />
          <ellipse cx={2.4} cy={6 + footB * 0.6} rx={1.8} ry={1.1} className="fill-warning" />

          {/* Body */}
          <ellipse cx={0} cy={0} rx={7} ry={5.5} className="fill-warning" />

          {/* Wing swings gently */}
          <g transform={`translate(-1 0) rotate(${wing})`}>
            <ellipse cx={0} cy={0} rx={4} ry={2.4} className="fill-warning/80" />
          </g>

          {/* Head + face */}
          <g transform={`translate(5 -4) rotate(${headTilt})`}>
            <circle cx={0} cy={0} r={4} className="fill-warning" />
            {/* Beak */}
            <path d="M 3.2 0.5 L 7 -0.2 L 3.2 1.8 Z" className="fill-orange-500" />
            {/* Eye + blink */}
            {blink ? (
              <rect x={-0.6} y={-1.5} width={2} height={0.5} className="fill-black" />
            ) : (
              <>
                <circle cx={0.4} cy={-1} r={0.8} className="fill-black" />
                <circle cx={0.7} cy={-1.3} r={0.25} className="fill-white" />
              </>
            )}
            {/* Happy smile */}
            <path d="M 2 1.5 Q 3 2.4 4 1.6" stroke="currentColor" strokeWidth={0.4} fill="none" className="text-orange-700" />
          </g>

          {/* Magnifying glass — swings from the wing, spins during celebration */}
          <g
            transform={`translate(-4 2) rotate(${
              phase === "celebrate" ? (cycleT * 720) % 360 : glassSwing
            })`}
          >
            <line x1={0} y1={0} x2={-3.5} y2={3.5} stroke="#7a4a1f" strokeWidth={0.8} strokeLinecap="round" />
            <circle cx={-5.2} cy={5.2} r={2.6} fill="rgba(180,220,255,0.6)" stroke="#7a4a1f" strokeWidth={0.7} />
          </g>
        </g>

        {/* Celebration sparkles + confetti burst at destination */}
        {phase === "celebrate" && (
          <g>
            {Array.from({ length: 10 }).map((_, i) => {
              const a = (i / 10) * Math.PI * 2;
              const r = 14;
              const x = Math.cos(a) * r;
              const y = Math.sin(a) * r;
              const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6"];
              return (
                <circle
                  key={i}
                  cx={0}
                  cy={0}
                  r={1.4}
                  fill={colors[i % colors.length]}
                  style={{
                    animation: `confetti-burst 900ms ease-out forwards`,
                    transformOrigin: "0 0",
                    // @ts-expect-error CSS var for keyframe endpoint
                    "--tx": `${x}px`,
                    "--ty": `${y}px`,
                  }}
                />
              );
            })}
            {[0, 1, 2, 3, 4].map((i) => (
              <text
                key={i}
                x={0}
                y={-12}
                fontSize={5}
                textAnchor="middle"
                style={{
                  animation: `sparkle-pop 900ms ease-out forwards`,
                  animationDelay: `${i * 60}ms`,
                  transformOrigin: "center",
                }}
              >
                ✨
              </text>
            ))}
          </g>
        )}
      </g>
    </g>
  );
}
