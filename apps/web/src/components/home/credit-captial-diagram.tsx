import { useEffect, useId, useState } from "react";
import { CreditCapacityCard } from "./credit-capacity-card";

const collateralAssets = ["AAPL", "NVDA", "TSLA"];

/* -------------------------------------------------------------------------- */
/* Geometry: one coordinate space (SVG user units) drives both the SVG paths   */
/* and the HTML nodes, so they can never drift apart.                          */
/*                                                                             */
/*   Alice ──fan──> assets ──collect──> merge ──trunk──> card                  */
/* -------------------------------------------------------------------------- */
const W = 1000;
const H = 300;
const CY = H / 2;
const PAD_Y = 46; // centre of first / last asset row

const SOURCE_END_X = 90; // right edge of the Alice node
const ASSET_X = 300; // left edge of the asset column
const ASSET_W = 100; // width of an asset node
const MERGE_X = 560; // convergence point
const CARD_W = 350;
const CARD_X = W - CARD_W; // trunk ends where the card begins

const rowY = (i: number, n: number) =>
  n === 1 ? CY : PAD_Y + (i * (H - PAD_Y * 2)) / (n - 1);

/** Horizontal S-curve between two points. */
const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
};

const fanPath = (y: number) => curve(SOURCE_END_X, CY, ASSET_X, y);
const collectPath = (y: number) => curve(ASSET_X + ASSET_W, y, MERGE_X, CY);
const TRUNK_PATH = `M ${MERGE_X} ${CY} L ${CARD_X} ${CY}`;

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/* -------------------------------------------------------------------------- */
/* Motion timing (seconds)                                                     */
/* -------------------------------------------------------------------------- */
const DRAW = 0.9; // each line draws in over this long
const DELAY = { fan: 0, collect: 0.6, trunk: 1.1, dot: 1.3 };
const FLOW_START = 2.1; // particles begin once everything is drawn
const CYCLE = 3; // one full particle loop
const TRAVEL = { fan: 1.0, collect: 1.2, trunk: 0.4 }; // must sum to <= CYCLE

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/* -------------------------------------------------------------------------- */
/* SVG building blocks                                                         */
/* -------------------------------------------------------------------------- */
type LineProps = {
  id: string;
  d: string;
  delay: number;
  animated: boolean;
};

function Line({ id, d, delay, animated }: LineProps) {
  return (
    <path
      id={id}
      d={d}
      pathLength={1}
      fill="none"
      stroke="currentColor"
      strokeOpacity={0.3}
      strokeWidth={2}
      strokeDasharray={animated ? 1 : undefined}
      strokeDashoffset={animated ? 1 : undefined}
      className="text-primary"
    >
      {animated && (
        <animate
          attributeName="stroke-dashoffset"
          from="1"
          to="0"
          dur={`${DRAW}s`}
          begin={`${delay}s`}
          fill="freeze"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.22 1 0.36 1"
        />
      )}
    </path>
  );
}

type ParticleProps = {
  pathId: string;
  begin: number;
  travel: number; // seconds spent moving; rest of the cycle is idle
};

function Particle({ pathId, begin, travel }: ParticleProps) {
  const f = travel / CYCLE;

  return (
    <circle r={3.5} fill="currentColor" opacity={0} className="text-primary">
      <animateMotion
        dur={`${CYCLE}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        calcMode="linear"
        keyPoints="0;1;1"
        keyTimes={`0;${f};1`}
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        dur={`${CYCLE}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        values="0;1;1;0;0"
        keyTimes={`0;0.02;${f - 0.01};${f};1`}
      />
    </circle>
  );
}

/* -------------------------------------------------------------------------- */
/* HTML node (Alice and each asset share the same shape)                       */
/* -------------------------------------------------------------------------- */
function TokenNode({ label, source = false }: { label: string; source?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-[0.6rem] font-semibold shadow-sm ${
          source ? "bg-primary/60 text-background" : "bg-background text-foreground/60"
        }`}
      >
        {label[0]}
      </div>
      <span className="text-xs font-bold text-foreground/55">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */
type CreditCapacityDiagramProps = {
  owner?: string;
  assets?: string[];
  capacity?: string;
};

export function CreditCapacityDiagram({
  owner = "Alice",
  assets = collateralAssets,
  capacity = "$29,250",
}: CreditCapacityDiagramProps) {
  const uid = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const animated = !reduced;

  const n = assets.length;
  const stagger = CYCLE / n; // one particle arrives at the merge every `stagger`s
  const trunkId = `${uid}-trunk`;
  const fanId = (i: number) => `${uid}-fan-${i}`;
  const collectId = (i: number) => `${uid}-collect-${i}`;

  return (
    <div className="mt-4 overflow-x-auto p-8 md:p-12">
      <div
        className="relative mx-auto aspect-[10/3] w-full min-w-[900px] max-w-[1000px]"
        role="group"
        aria-label={`${owner}'s ${assets.join(", ")} collateral combines into ${capacity} of potential USDG credit`}
      >
        {/* Connection layer */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
        >
          {/* Alice -> each asset */}
          {assets.map((asset, i) => (
            <Line
              key={`fan-${asset}`}
              id={fanId(i)}
              d={fanPath(rowY(i, n))}
              delay={DELAY.fan + i * 0.1}
              animated={animated}
            />
          ))}

          {/* Each asset -> merge point */}
          {assets.map((asset, i) => (
            <Line
              key={`collect-${asset}`}
              id={collectId(i)}
              d={collectPath(rowY(i, n))}
              delay={DELAY.collect + i * 0.1}
              animated={animated}
            />
          ))}

          {/* Merge point -> card */}
          <Line id={trunkId} d={TRUNK_PATH} delay={DELAY.trunk} animated={animated} />

          {/* Convergence point */}
          <circle
            cx={MERGE_X}
            cy={CY}
            r={4}
            fill="currentColor"
            opacity={animated ? 0 : 1}
            className="text-primary"
          >
            {animated && (
              <animate
                attributeName="opacity"
                from="0"
                to="1"
                dur="0.3s"
                begin={`${DELAY.dot}s`}
                fill="freeze"
              />
            )}
          </circle>

          {animated && (
            <>
              {/* Pulse each time a particle arrives at the merge point */}
              <circle
                cx={MERGE_X}
                cy={CY}
                r={4}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                opacity={0}
                className="text-primary"
              >
                <animate
                  attributeName="r"
                  values="4;14"
                  dur={`${stagger}s`}
                  begin={`${FLOW_START + TRAVEL.fan + TRAVEL.collect}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0"
                  dur={`${stagger}s`}
                  begin={`${FLOW_START + TRAVEL.fan + TRAVEL.collect}s`}
                  repeatCount="indefinite"
                />
              </circle>

              {/* Particles: Alice -> asset -> merge -> card */}
              {assets.map((asset, i) => {
                const begin = FLOW_START + i * stagger;
                return (
                  <g key={asset}>
                    <Particle pathId={fanId(i)} begin={begin} travel={TRAVEL.fan} />
                    <Particle
                      pathId={collectId(i)}
                      begin={begin + TRAVEL.fan}
                      travel={TRAVEL.collect}
                    />
                    <Particle
                      pathId={trunkId}
                      begin={begin + TRAVEL.fan + TRAVEL.collect}
                      travel={TRAVEL.trunk}
                    />
                  </g>
                );
              })}
            </>
          )}
        </svg>

        {/* Source node */}
        <div className="absolute left-0 top-1/2 z-10 -translate-y-1/2">
          <TokenNode label={owner} source />
        </div>

        {/* Asset nodes */}
        {assets.map((asset, i) => (
          <div
            key={asset}
            className="absolute z-10 -translate-y-1/2"
            style={{
              left: pct(ASSET_X, W),
              top: pct(rowY(i, n), H),
              width: pct(ASSET_W, W),
            }}
          >
            <TokenNode label={asset} />
          </div>
        ))}

        {/* Credit capacity */}
        <div
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2"
          style={{ width: pct(CARD_W, W) }}
        >
          <CreditCapacityCard capacity={capacity} assets={assets} />
        </div>
      </div>
    </div>
  );
}