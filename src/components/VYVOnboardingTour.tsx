/* VYVOnboardingTour.tsx
   Onboarding "old money" con blur premium + spotlight + se muestra 1 sola vez.
   Replaces the old GuideTourOverlay as the primary onboarding experience.
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVYVContextHelp } from "@/hooks/use-context-help";

type Placement = "top" | "bottom" | "left" | "right";

type Step = {
  id: string;
  title: string;
  body: string;
  selector: string;
  placement?: Placement;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getTargetRect(selector: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { el, r };
}

function computeCardPosition(r: DOMRect, placement: Placement, cardW: number, cardH: number) {
  const margin = 14;
  let x = r.left + r.width / 2 - cardW / 2;
  let y = r.top - cardH - margin;
  if (placement === "bottom") y = r.bottom + margin;
  if (placement === "left") { x = r.left - cardW - margin; y = r.top + r.height / 2 - cardH / 2; }
  if (placement === "right") { x = r.right + margin; y = r.top + r.height / 2 - cardH / 2; }
  const pad = 12;
  x = clamp(x, pad, window.innerWidth - cardW - pad);
  y = clamp(y, pad, window.innerHeight - cardH - pad);
  return { x, y };
}

export default function VYVOnboardingTour({
  steps,
  /** Called when tour ends (finish or skip). Parent is responsible for persisting. */
  onComplete,
  autoStartDelayMs = 350,
}: {
  steps: Step[];
  onComplete: () => void;
  /** @deprecated kept for backward compat */
  storageKey?: string;
  autoStartDelayMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [target, setTarget] = useState<{ el: HTMLElement; r: DOMRect } | null>(null);
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 18, y: 18 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const step = useMemo(() => steps[idx], [steps, idx]);
  const { seed: seedContextHelp } = useVYVContextHelp();

  // Start automatically — parent decides whether to mount us at all
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), autoStartDelayMs);
    return () => window.clearTimeout(t);
  }, [autoStartDelayMs]);

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Resolve target & position
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const info = getTargetRect(step.selector);
      if (!info) {
        setTarget(null);
        return;
      }
      setTarget({ el: info.el, r: info.r });
      const card = cardRef.current;
      const cardW = card?.offsetWidth ?? 320;
      const cardH = card?.offsetHeight ?? 140;
      const placement = step.placement ?? "top";
      const { x, y } = computeCardPosition(info.r, placement, cardW, cardH);
      setCardPos({ x, y });
      info.el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  const close = () => {
    // Delegate all persistence to the parent via onComplete callback
    onComplete();
    // Seed context help system so micro-tooltips start appearing
    seedContextHelp();
    setOpen(false);
  };

  const next = () => {
    if (idx >= steps.length - 1) return close();
    setIdx((v) => v + 1);
  };

  const back = () => setIdx((v) => Math.max(0, v - 1));

  if (!open) return null;

  // Spotlight geometry
  const spot = target?.r
    ? {
        cx: target.r.left + target.r.width / 2,
        cy: target.r.top + target.r.height / 2,
        rx: Math.max(34, target.r.width / 2 + 16),
        ry: Math.max(34, target.r.height / 2 + 16),
      }
    : { cx: window.innerWidth / 2, cy: window.innerHeight / 2, rx: 56, ry: 56 };

  const placement = step.placement ?? "top";

  return (
    <>
      <style>{tourStyles}</style>
      <div className="vyvTourOverlay" role="dialog" aria-modal="true">
        <svg className="vyvTourMask" width="100%" height="100%">
          <defs>
            <mask id="vyvMask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <ellipse cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry} fill="black" />
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" className="vyvTourDim" mask="url(#vyvMask)" />
          <ellipse cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry} className="vyvTourHalo" />
        </svg>

        <div
          ref={cardRef}
          className="vyvTourCard"
          style={{ transform: `translate3d(${cardPos.x}px, ${cardPos.y}px, 0)` }}
        >
          <button className="vyvTourClose" onClick={close} aria-label="Cerrar">×</button>
          <div className="vyvTourDots" aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} className={`vyvDot ${i === idx ? "active" : ""}`} />
            ))}
          </div>
          <div className="vyvTourTitle">{step.title}</div>
          <div className="vyvTourBody">{step.body}</div>
          <div className="vyvTourActions">
            <button className="vyvBtnGhost" onClick={close}>Saltar</button>
            <div className="vyvRight">
              <button className="vyvBtnGhost" onClick={back} disabled={idx === 0}>
                Atrás
              </button>
              <button className="vyvBtnPrimary" onClick={next}>
                {idx === steps.length - 1 ? "Listo" : "Siguiente"} <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <div className={`vyvPointer ${placement}`} aria-hidden="true" />
        </div>
      </div>
    </>
  );
}

const tourStyles = `
.vyvTourOverlay{
  position: fixed;
  inset: 0;
  z-index: 9999;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}
.vyvTourMask{
  position:absolute;
  inset:0;
}
.vyvTourDim{
  fill: rgba(7, 12, 16, 0.66);
}
.vyvTourHalo{
  fill: none;
  stroke: rgba(235, 232, 222, 0.62);
  stroke-width: 1.2;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
}
.vyvTourCard{
  position:absolute;
  width: 340px;
  max-width: calc(100vw - 24px);
  border-radius: 18px;
  padding: 16px 16px 14px 16px;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(235, 232, 222, 0.22);
  box-shadow:
    0 18px 40px rgba(0,0,0,0.44),
    inset 0 1px 0 rgba(255,255,255,0.12);
  color: rgba(245, 244, 240, 0.92);
}
.vyvTourClose{
  position:absolute;
  top: 10px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(235,232,222,0.18);
  background: rgba(255,255,255,0.06);
  color: rgba(245,244,240,0.86);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 18px;
  line-height:1;
}
.vyvTourDots{
  display:flex;
  gap: 6px;
  padding-top: 2px;
  padding-bottom: 10px;
}
.vyvDot{
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(235,232,222,0.26);
}
.vyvDot.active{
  background: rgba(235,232,222,0.82);
}
.vyvTourTitle{
  font-weight: 620;
  letter-spacing: .2px;
  font-size: 15px;
  margin-bottom: 6px;
}
.vyvTourBody{
  font-size: 13px;
  line-height: 1.35;
  color: rgba(245,244,240,0.80);
  margin-bottom: 12px;
}
.vyvTourActions{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 12px;
}
.vyvRight{
  display:flex;
  gap: 10px;
  align-items:center;
}
.vyvBtnGhost{
  border: 1px solid rgba(235,232,222,0.18);
  background: rgba(255,255,255,0.05);
  color: rgba(245,244,240,0.86);
  border-radius: 12px;
  padding: 9px 12px;
  font-size: 13px;
  cursor:pointer;
}
.vyvBtnGhost:disabled{
  opacity:.45;
  cursor: default;
}
.vyvBtnPrimary{
  border: 1px solid rgba(235,232,222,0.26);
  background: rgba(18, 34, 28, 0.72);
  color: rgba(245,244,240,0.92);
  border-radius: 12px;
  padding: 9px 12px;
  font-size: 13px;
  cursor:pointer;
  box-shadow: 0 10px 22px rgba(0,0,0,0.30);
}
.vyvPointer{
  position:absolute;
  width: 14px;
  height: 14px;
  background: rgba(255,255,255,0.10);
  border-left: 1px solid rgba(235,232,222,0.18);
  border-top: 1px solid rgba(235,232,222,0.18);
  transform: rotate(45deg);
}
.vyvPointer.top{ bottom:-7px; left: 32px; }
.vyvPointer.bottom{ top:-7px; left: 32px; transform: rotate(225deg); }
.vyvPointer.left{ right:-7px; top: 28px; transform: rotate(135deg); }
.vyvPointer.right{ left:-7px; top: 28px; transform: rotate(-45deg); }
`;
