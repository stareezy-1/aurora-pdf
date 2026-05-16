import { useEffect, useState } from "react";

interface ClearModalProps {
  filename: string;
  onComplete: () => void;
}

// ── Particle ─────────────────────────────────────────────────────────────────
// A single shredded paper strip flying toward the shredder slot.

interface Particle {
  id: number;
  x: number; // % from left of the document icon
  delay: number; // animation delay in ms
  width: number; // strip width in px
  height: number; // strip height in px
  color: string;
}

function makeParticles(): Particle[] {
  const colors = ["#e2e8f0", "#cbd5e1", "#f1f5f9", "#94a3b8", "#e2e8f0"];
  return Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: 8 + (i % 6) * 14,
    delay: i * 90,
    width: 6 + Math.random() * 8,
    height: 18 + Math.random() * 14,
    color: colors[i % colors.length],
  }));
}

const PARTICLES = makeParticles();

/**
 * ClearModal — shown after the user clicks Download.
 *
 * Phase 1 (~1.6s): Animated shredder — paper strips fall into the shredder slot.
 * Phase 2 (~0.8s): "All clear!" — green shield, confirmation message.
 * Then calls onComplete() which resets all tool state.
 */
export function ClearModal({ filename, onComplete }: ClearModalProps) {
  const [phase, setPhase] = useState<"shredding" | "done">("shredding");
  const [activeParticles, setActiveParticles] = useState<number[]>([]);

  useEffect(() => {
    // Stagger particles entering the shredder
    const timers: ReturnType<typeof setTimeout>[] = [];
    PARTICLES.forEach((p) => {
      timers.push(
        setTimeout(() => {
          setActiveParticles((prev) => [...prev, p.id]);
        }, p.delay),
      );
    });

    // Switch to "done" phase after all particles have animated
    const doneTimer = setTimeout(() => {
      setPhase("done");
    }, PARTICLES.length * 90 + 700);

    // Call onComplete after the done phase is visible
    const completeTimer = setTimeout(() => {
      onComplete();
    }, PARTICLES.length * 90 + 1500);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,5,5,0.82)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.25s ease",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Clearing data"
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "40px 44px 36px",
          width: "min(400px, 90vw)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {phase === "shredding" ? (
          <>
            {/* ── Shredder scene ── */}
            <div
              style={{
                position: "relative",
                width: 120,
                height: 140,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {/* Paper strips falling */}
              {PARTICLES.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left: p.x,
                    top: 0,
                    width: p.width,
                    height: p.height,
                    background: p.color,
                    borderRadius: 2,
                    opacity: activeParticles.includes(p.id) ? 0 : 1,
                    transform: activeParticles.includes(p.id)
                      ? "translateY(90px) scaleY(0.3)"
                      : "translateY(0) scaleY(1)",
                    transition: activeParticles.includes(p.id)
                      ? "transform 0.45s ease-in, opacity 0.45s ease-in"
                      : "none",
                  }}
                />
              ))}

              {/* Shredder body */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 100,
                  height: 52,
                  background: "var(--surface-2)",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingTop: 6,
                  gap: 3,
                }}
              >
                {/* Feed slot */}
                <div
                  style={{
                    width: 72,
                    height: 5,
                    background: "#1a1a2e",
                    borderRadius: 2,
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                  }}
                />
                {/* Shredded strips coming out */}
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    marginTop: 4,
                    opacity: activeParticles.length > 3 ? 1 : 0,
                    transition: "opacity 0.3s",
                  }}
                >
                  {[14, 10, 16, 12, 14, 10].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: 5,
                        height: h,
                        background: PARTICLES[i % PARTICLES.length].color,
                        borderRadius: "0 0 2px 2px",
                        animation: `shredStrip 0.4s ease-in-out ${
                          i * 60
                        }ms infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: 6,
                }}
              >
                Shredding your data…
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {filename}
              </div>
            </div>

            {/* Animated dots */}
            <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--green)",
                    animation: `dotPulse 0.9s ease-in-out ${
                      i * 0.2
                    }s infinite alternate`,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* ── All clear ── */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(0,255,136,0.12)",
                border: "2px solid var(--green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                animation: "scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              aria-hidden="true"
            >
              🛡
            </div>

            <div
              style={{
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--green)",
                  letterSpacing: "-0.02em",
                }}
              >
                All clear!
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                }}
              >
                Your file was downloaded and all temporary data has been wiped
                from memory. Nothing was uploaded or stored.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              {["No uploads", "No storage", "No traces"].map((label) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <span style={{ color: "var(--green)" }}>✓</span>
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes dotPulse {
          from { opacity: 0.3; transform: scale(0.8); }
          to   { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes shredStrip {
          from { transform: translateY(0); }
          to   { transform: translateY(4px); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
