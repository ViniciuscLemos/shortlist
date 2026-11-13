import { analyze } from './match';
import type { Lang } from './words';

// Every resume compared is kept (the last 8 different ones), so the next fix can be checked
// against the one before: did the score for this ad go up, and which skills did it start or
// stop showing? Kept in this browser like everything else.

export interface Version {
  id: string;
  /** when it was compared, ISO */
  at: string;
  text: string;
}

export interface VersionScore {
  version: Version;
  score: number;
  /** skills of the ad this version shows and the one before it didn't, and the other way round */
  gained: string[];
  lost: string[];
}

const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

/** Adds the resume unless it's the same as the newest one kept; newest first, 8 at most. */
export function keepVersion(versions: Version[], text: string, now = new Date()): Version[] {
  if (!text.trim() || (versions[0] && same(versions[0].text, text))) return versions;
  // the same text from further back moves to the top instead of being there twice
  const rest = versions.filter((v) => !same(v.text, text));
  return [{ id: String(now.getTime()), at: now.toISOString(), text }, ...rest].slice(0, 8);
}

/** Each version against the same ad, newest first, with what changed from the one before. */
export function scoreVersions(versions: Version[], job: string, now = new Date(), lang: Lang = 'en'): VersionScore[] {
  const reports = versions.map((v) => analyze(v.text, job, now, lang));
  // shown being used (a job, a project), not only typed in a list of skills
  const shown = reports.map((r) => new Set(r.skills.filter((s) => s.evidence && !s.onlyListed).map((s) => s.skill.name)));
  return versions.map((version, i) => {
    const older = shown[i + 1];
    return {
      version,
      score: reports[i]!.score,
      gained: older ? [...shown[i]!].filter((n) => !older.has(n)) : [],
      lost: older ? [...older].filter((n) => !shown[i]!.has(n)) : [],
    };
  });
}
