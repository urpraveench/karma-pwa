// The motion logo ("Bead fill"): the gold bead appears, the 18 beads fill clockwise one by one, the gold bead pulses,
// then the name and brand line come in, ending on the static logo (GTM-23, GTM-24). Pure, so it's unit-tested;
// scripts/brand-kit.mjs writes the animated SVGs and scripts/brand-motion.mjs records the videos.

export const FILLED = 18;

/** Seconds from the start. */
export const T = {
  restIn: 0.1, restFor: 0.3, // the ring of empty beads fades in
  goldFor: 0.35, // the gold bead grows in, from the start
  fillAt: 0.45, fillStep: 0.05, fillFor: 0.12, // each filled bead, clockwise from the gold one
  pulseAt: 1.45, pulseFor: 0.4, // the gold bead pulses once the fill is done
  nameAt: 1.55, nameFor: 0.4,
  lineAt: 1.95, lineFor: 0.4,
};

/** How long the animation runs: the ring alone stops after the pulse; a lockup with the name, after its brand line. */
export const duration = (withName: boolean) => +(withName ? T.lineAt + T.lineFor : T.pulseAt + T.pulseFor).toFixed(3);

/** When the k-th filled bead (0 = the one after the gold bead) starts to fill. */
export const fillDelay = (k: number) => +(T.fillAt + k * T.fillStep).toFixed(3);

export type Cue = { at: number; sound: 'tick' | 'chime' };
/** The sound track: a tick as each bead fills, a chime on the gold bead's pulse. */
export const cues = (): Cue[] => [
  ...Array.from({ length: FILLED }, (_, k) => ({ at: fillDelay(k), sound: 'tick' as const })),
  { at: T.pulseAt, sound: 'chime' as const },
];

const s = (x: number) => `${+x.toFixed(3)}s`;

/**
 * The CSS that animates a lockup. The SVG's own attributes are the final, static logo; the animation only runs from
 * a start state to them, so a viewer with reduced motion (or a tool that ignores CSS) sees the static logo.
 * Classes: tm-r empty bead, tm-b filled bead (its fill delay inline), tm-p > tm-g the gold bead, tm-n name, tm-l line.
 * `id` keeps the colour keyframes apart when several animated logos share a page.
 */
export function motionStyle({ id, ink, rest, name }: { id: string; ink: string; rest: string; name: 'left' | 'up' | null }) {
  const from = name === 'up' ? 'translate(0,10px)' : 'translate(-14px,0)';
  return '<style>'
    + '.tm-r,.tm-b,.tm-g,.tm-p,.tm-n,.tm-l{transform-box:fill-box;transform-origin:center}'
    + `.tm-r{animation:tm-in ${s(T.restFor)} ease-out ${s(T.restIn)} both}`
    + `.tm-b{animation:tm-in ${s(T.restFor)} ease-out ${s(T.restIn)} both,tm-fill-${id} ${s(T.fillFor)} ease-out both}`
    + `.tm-g{animation:tm-pop ${s(T.goldFor)} cubic-bezier(.34,1.8,.64,1) both}`
    + `.tm-p{animation:tm-pulse ${s(T.pulseFor)} ease-in-out ${s(T.pulseAt)} forwards}`
    + (name ? `.tm-n{animation:tm-name ${s(T.nameFor)} cubic-bezier(.33,1,.68,1) ${s(T.nameAt)} both}`
      + `.tm-l{animation:tm-line ${s(T.lineFor)} ease-out ${s(T.lineAt)} both}` : '')
    + '@keyframes tm-in{from{opacity:0}}'
    + `@keyframes tm-fill-${id}{from{fill:${rest}}50%{transform:scale(1.5)}to{fill:${ink}}}`
    + '@keyframes tm-pop{from{transform:scale(0)}}'
    + '@keyframes tm-pulse{50%{transform:scale(1.35)}}'
    + (name ? `@keyframes tm-name{from{opacity:0;transform:${from}}}@keyframes tm-line{from{opacity:0;transform:translate(0,4px)}}` : '')
    + '@media (prefers-reduced-motion:reduce){.tm-r,.tm-b,.tm-g,.tm-p,.tm-n,.tm-l{animation:none}}'
    + '</style>';
}

/** Each filled bead's inline delays: the empty ring's fade, then its own fill. */
export const fillStyle = (k: number) => `animation-delay:${s(T.restIn)},${s(fillDelay(k))}`;
