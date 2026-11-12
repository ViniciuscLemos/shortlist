import { analyze } from './match';
import type { Lang } from './words';

// Several job ads against the same resume, to see which one is worth applying to first.
// The ads are kept in this browser; the scores are worked out again each time, so a resume
// that gets better moves every ad up.

export interface SavedAd {
  id: string;
  title: string;
  text: string;
}

export interface AdRank {
  ad: SavedAd;
  score: number;
  required: { found: number; total: number };
  /** the required skills the resume doesn't show, by name */
  missing: string[];
}

/** A name for an ad: its first short line (usually the role), cut at 70 characters. */
export function adTitle(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = lines.find((l) => l.length <= 90) ?? lines[0] ?? '';
  return first.length > 70 ? `${first.slice(0, 69).trimEnd()}…` : first;
}

export function rankAds(resume: string, ads: SavedAd[], now = new Date(), lang: Lang = 'en'): AdRank[] {
  return ads
    .map((ad) => {
      const report = analyze(resume, ad.text, now, lang);
      const required = report.skills.filter((s) => s.weight === 'required');
      return {
        ad,
        score: report.score,
        required: { found: required.filter((s) => s.evidence).length, total: required.length },
        missing: required.filter((s) => !s.evidence).map((s) => s.skill.name),
      };
    })
    .sort((a, b) => b.score - a.score || a.ad.title.localeCompare(b.ad.title));
}

/** Adds an ad to the list unless the same text is already there; at most 12 kept, newest first. */
export function keepAd(ads: SavedAd[], text: string, id = String(Date.now())): SavedAd[] {
  const same = (t: string) => t.replace(/\s+/g, ' ').trim();
  if (ads.some((a) => same(a.text) === same(text))) return ads;
  return [{ id, title: adTitle(text) || 'Untitled ad', text }, ...ads].slice(0, 12);
}
