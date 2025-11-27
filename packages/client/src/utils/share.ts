export interface ShareableScore {
  playerName: string;
  wave: number;
  kills: number;
  damageDealt: number;
  towersPlaced: number;
  governor: string | null;
  victory: boolean;
  difficulty?: string;
}

export function generateShareText(entry: ShareableScore): string {
  const result = entry.victory ? 'Victory!' : `Defeated at wave ${entry.wave}/40`;
  const gov = entry.governor ? ` (${entry.governor})` : '';
  const diff = entry.difficulty && entry.difficulty !== 'normal' ? ` [${entry.difficulty}]` : '';
  return [
    `ZAStd Tower Defense - ${result}${diff}`,
    `Wave: ${entry.wave}/40 | Kills: ${entry.kills} | Damage: ${entry.damageDealt} | Towers: ${entry.towersPlaced}${gov}`,
    `https://zastd.koyeb.app`,
  ].join('\n');
}

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {}
  document.body.removeChild(textarea);
  return success;
}

export async function shareScore(entry: ShareableScore): Promise<'shared' | 'copied' | 'failed'> {
  const text = generateShareText(entry);

  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e: any) {
      if (e.name === 'AbortError') return 'failed';
      // Fall through to clipboard
    }
  }

  // Try modern clipboard API
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // Fall through to legacy fallback
  }

  // Legacy fallback: execCommand('copy')
  if (fallbackCopyText(text)) {
    return 'copied';
  }

  return 'failed';
}
