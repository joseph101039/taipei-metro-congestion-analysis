/**
 * Color scale: 0→green, mid→yellow, high→red
 * Returns CSS rgb string for a ratio 0..1
 */
export function getLoadColor(ratio) {
  const r = ratio < 0.5 ? Math.round(34 + (234 - 34) * (ratio / 0.5)) : Math.round(234 + (239 - 234) * ((ratio - 0.5) / 0.5));
  const g = ratio < 0.5 ? Math.round(197 + (179 - 197) * (ratio / 0.5)) : Math.round(179 - (179 - 68) * ((ratio - 0.5) / 0.5));
  const b = ratio < 0.5 ? Math.round(94 + (8 - 94) * (ratio / 0.5)) : Math.round(8 + (68 - 8) * ((ratio - 0.5) / 0.5));
  return `rgb(${r},${g},${b})`;
}

/**
 * Congestion-rate color scale:
 *   0–1.0  →  green → yellow → red  (same gradient as getLoadColor)
 *   ≥ 1.0  →  deep red (overloaded)
 * @param {number} rate  0 = empty, 1.0 = at capacity, >1 = overloaded
 */
export function getCongestionColor(rate) {
  if (rate >= 1.0) return 'rgb(185,28,28)';
  return getLoadColor(Math.max(0, rate));
}

