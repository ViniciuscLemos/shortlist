import { skillsIn } from './find';
import type { Skill } from './skills';
import { lines, plain, words } from './text';

export type ResumeSection = 'summary' | 'experience' | 'projects' | 'education' | 'skills' | 'languages' | 'other';

export interface Evidence {
  skill: Skill;
  /** every section where it shows up */
  sections: Set<ResumeSection>;
  /** the first line that shows it being used (experience or projects), or just where it is */
  line: string;
}

export interface Resume {
  evidence: Map<string, Evidence>;
  sections: Set<ResumeSection>;
  words: number;
  contact: { email: boolean; phone: boolean; linkedin: boolean; github: boolean };
  /** lines under experience and projects: what was done */
  doneLines: string[];
  months: number;
}

const SECTION_HEADERS: [ResumeSection, RegExp][] = [
  ['summary', /^(resumo( profissional)?|sobre( mim)?|perfil( profissional)?|objetivo|summary|about( me)?|profile|objective)$/],
  ['experience', /^(experiencias?( profissionais?)?|historico profissional|experience|work experience|professional experience|employment( history)?)$/],
  ['projects', /^(projetos( pessoais)?|projects|personal projects|portfolio)$/],
  ['education', /^(formacao( academica)?|educacao|escolaridade|education|academic background)$/],
  ['skills', /^(habilidades( tecnicas)?|competencias( tecnicas)?|conhecimentos( tecnicos)?|tecnologias|stack|skills|technical skills|tech stack|ferramentas|tools)$/],
  ['languages', /^(idiomas|languages)$/],
  ['other', /^(certificacoes|certificados|cursos|certifications|courses|atividades|voluntariado|volunteering|premios|awards)$/],
];

function sectionOf(line: string): ResumeSection | null {
  const flat = plain(line).replace(/[:\-–]+$/, '').trim();
  if (flat.length > 40) return null;
  for (const [section, pattern] of SECTION_HEADERS) if (pattern.test(flat)) return section;
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5, jul: 6,
  ago: 7, aug: 7, set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dec: 11,
};
const MONTH = '(jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-z]*\\.?';
const POINT = `(?:(${MONTH})\\s*(?:de\\s*)?|(\\d{1,2})\\/)?(\\d{4})`;
const RANGE = new RegExp(`${POINT}\\s*(?:-|–|a|ate|to|until)\\s*(?:${POINT}|(atual|atualmente|presente|present|hoje|now|current|o momento))`, 'g');

function monthIndex(name: string | undefined, number: string | undefined, year: string): number {
  const month = name ? MONTHS[name.slice(0, 3)] ?? 0 : number ? Math.min(Math.max(Number(number) - 1, 0), 11) : 0;
  return Number(year) * 12 + month;
}

/**
 * Months of experience from the date ranges in the experience section ("mar 2022 - atual",
 * "01/2020 – 12/2021"). Overlapping jobs count once: two jobs at the same time aren't
 * two years of experience.
 */
export function experienceMonths(text: string, now = new Date()): number {
  const ranges: [number, number][] = [];
  const today = now.getFullYear() * 12 + now.getMonth();
  for (const m of plain(text).matchAll(RANGE)) {
    const start = monthIndex(m[2], m[3], m[4]);
    // groups: 2-4 the start (month name, month number, year), 6-8 the end, 9 "until now"
    const end = m[9] ? today : monthIndex(m[6], m[7], m[8]);
    if (end >= start && start > 1950 * 12) ranges.push([start, Math.min(end, today) + 1]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let reach = -Infinity;
  for (const [start, end] of ranges) {
    if (end <= reach) continue;
    total += end - Math.max(start, reach);
    reach = end;
  }
  return total;
}

export function readResume(text: string, now = new Date()): Resume {
  const evidence = new Map<string, Evidence>();
  const sections = new Set<ResumeSection>();
  const doneLines: string[] = [];
  const experienceText: string[] = [];
  let section: ResumeSection = 'summary';

  for (const line of lines(text)) {
    const header = sectionOf(line);
    if (header) {
      section = header;
      sections.add(header);
      continue;
    }
    if (section === 'experience' || section === 'projects') doneLines.push(line);
    if (section === 'experience') experienceText.push(line);
    for (const skill of skillsIn(line)) {
      const seen = evidence.get(skill.id);
      const used = section === 'experience' || section === 'projects';
      if (!seen) evidence.set(skill.id, { skill, sections: new Set([section]), line });
      else {
        // prefer a line where it was used over one where it's only listed
        if (used && !seen.sections.has('experience') && !seen.sections.has('projects')) seen.line = line;
        seen.sections.add(section);
      }
    }
  }

  const flat = text.toLowerCase();
  return {
    evidence,
    sections,
    words: words(text),
    contact: {
      email: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
      phone: /(\+?\d{2}\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/.test(text),
      linkedin: flat.includes('linkedin.com/'),
      github: /github\.com\/|gitlab\.com\//.test(flat),
    },
    doneLines,
    months: experienceMonths(experienceText.join('\n'), now),
  };
}
