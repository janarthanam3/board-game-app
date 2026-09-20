/**
 * Returns a design colour with a different alpha, e.g. for the tinted tag pattern the screen specs
 * use (a role colour at 18% fill and 45% border). Accepts `#RRGGBB` or `rgba(r,g,b,a)`.
 */
export function withAlpha(colour: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour);
  if (hex && hex[1]) {
    const value = parseInt(hex[1], 16);
    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(colour);
  if (rgba) {
    return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${alpha})`;
  }
  throw new Error(`withAlpha: unsupported colour "${colour}"`);
}
