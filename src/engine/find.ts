import { SKILLS, type Skill } from './skills';
import { plain, termPattern } from './text';

interface Matcher {
  skill: Skill;
  test: (original: string, flat: string) => boolean;
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
  };
});

/** The skills mentioned in one line of text. */
export function skillsIn(line: string): Skill[] {
  const flat = plain(line);
  return MATCHERS.filter((m) => m.test(line, flat)).map((m) => m.skill);
}
