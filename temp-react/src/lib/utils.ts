export function esc(str: string): string {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

export function fmtDate(d: string | Date): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function statusClass(s: string): string {
  return `s-${s}`;
}

export function excelToDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + val * 86400000);
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  const parts = String(val).split('/');
  if (parts.length === 3) {
    const parsed = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function formatForLinkedIn(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/^---$/gm, '')
    .replace(/^- /gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatHashtags(input: string): string {
  return input
    .split(/[\s,;]+/)
    .map(t => t.trim().replace(/^#/, '').replace(/[^a-zA-Z0-9_éèêëàâäùûüôöîïçÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ]/g, ''))
    .filter(Boolean)
    .map(t => `#${t}`)
    .join(' ');
}

export const SUGGESTED_HASHTAGS = [
  '#maintenance', '#GMAO', '#industrie', '#performance', '#innovation',
  '#qualité', '#sécurité', '#IoT', '#transformationDigitale', '#optimisation',
  '#assetManagement', '#prédictif', '#digitalisation', '#fiabilité', '#SAP', '#Lean'
];

export const LINKEDIN_TARGET = 1500;
export const PAGE_SIZE = 10;
export const APP_VERSION = '160';
