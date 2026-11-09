import { SKILLS, type Skill } from './skills';
import { plain, termPattern } from './text';

interface Matcher {
  skill: Skill;
  test: (original: string, flat: string) => boolean;
  /** the words that matched, as written (or in plain form for the loose aliases) */
  found: (original: string, flat: string) => string | null;
}

// built once: one regex per alias
const MATCHERS: Matcher[] = SKILLS.map((skill) => {
  const exact = skill.aliases.filter((a) => a.startsWith('=')).map((a) => {
    const t = a.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}+#])${t}(?![\\p{L}\\p{N}+#])`, 'u');
  });
  const loose = skill.aliases.filter((a) => !a.startsWith('=')).map(termPattern);
  return {
    skill,
    test: (original, flat) => exact.some((r) => r.test(original)) || loose.some((r) => r.test(flat)),
    found: (original, flat) => {
      for (const r of exact) { const m = r.exec(original); if (m) return m[0]; }
      for (const r of loose) { const m = r.exec(flat); if (m) return m[0]; }
      return null;
    },
  };
});

/** The skills mentioned in one line of text. */
export function skillsIn(line: string): Skill[] {
  const flat = plain(line);
  return MATCHERS.filter((m) => m.test(line, flat)).map((m) => m.skill);
}

const BY_ID = new Map(MATCHERS.map((m) => [m.skill.id, m]));

/** How a line writes a skill: "Postgres", "postgresql", "k8s". Null when it doesn't. */
export function spelledAs(line: string, skillId: string): string | null {
  return BY_ID.get(skillId)?.found(line, plain(line)) ?? null;
}
