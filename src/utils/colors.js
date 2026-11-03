/**
 * Utilidades de color de la paleta gris plomo + lila.
 *
 * Las categorías guardan su color como hex (#rrggbb). Los colores originales del
 * catálogo eran muy saturados; aquí se traducen a tonos apagados que combinan con
 * la paleta, sin modificar los datos guardados hasta que el usuario edite la categoría.
 */
const SOFT_COLORS = {
  '#ef4444': '#d98c93', '#f43f5e': '#d68d9e', '#e11d48': '#c97f90', '#dc2626': '#c97f86',
  '#f97316': '#d9a07c', '#f59e0b': '#d9b57a', '#d97706': '#c9a06a', '#eab308': '#d2bf7c',
  '#84cc16': '#a9c08a', '#10b981': '#86bfa0', '#14b8a6': '#80b8b0', '#06b6d4': '#85b5c4',
  '#0ea5e9': '#8fb0cf', '#0284c7': '#7f9fc4', '#3b82f6': '#93a9d3', '#6366f1': '#9d9fd6',
  '#8b5cf6': '#a898d8', '#a855f7': '#b49ad6', '#ec4899': '#cf98bd', '#64748b': '#8f8e9c',
  '#475569': '#7a7986', '#78716c': '#8f8a87',
};

/** Paleta suave para categorías nuevas (mismos tonos que SOFT_COLORS). */
export const SOFT_PRESET_COLORS = [
  '#d98c93', '#d9a07c', '#d9b57a', '#86bfa0', '#80b8b0',
  '#8fb0cf', '#93a9d3', '#9d9fd6', '#a898d8', '#cf98bd',
  '#a9c08a', '#8f8e9c'
];

/** Devuelve la versión suave de un color de categoría (o el mismo si no es conocido). */
export function softColor(color) {
  if (typeof color !== 'string') return color;
  return SOFT_COLORS[color.toLowerCase()] || color;
}

/**
 * Aplica transparencia a un color. Acepta hex (#rrggbb) o variables CSS (var(--x)).
 * @param {string} color
 * @param {number} opacity 0..1
 */
export function tint(color, opacity) {
  if (!color) return 'transparent';
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
    return `${color}${a}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}
