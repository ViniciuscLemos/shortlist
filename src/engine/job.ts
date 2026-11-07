import { skillsIn } from './find';
import type { Skill } from './skills';
import { lines, plain } from './text';

export type Weight = 'required' | 'mentioned' | 'nice';

export interface JobSkill {
  skill: Skill;
  weight: Weight;
  /** the line of the ad it came from, to show why */
  line: string;
}

export type Level = 'intern' | 'junior' | 'mid' | 'senior' | 'lead';

export interface Job {
  skills: JobSkill[];
  years: number | null;
  level: Level | null;
}

type Section = Weight | 'ignore';

// headers of job ads, as they're usually written in Brazil and abroad
const HEADERS: [Section, RegExp][] = [
  ['nice', /^(diferenciais?|desejaveis?|sera um (grande )?diferencial|seria legal|nice to have|bonus( points)?|pluses|plus|preferred( qualifications)?|extras?)\b/],
  ['required', /^(requisitos( obrigatorios)?|obrigatorios?|o que (esperamos|buscamos|procuramos)|qualificacoes|pre-?requisitos|requirements|required|must have|what you (bring|need|have)|what we.?re looking for|you have|qualifications|competencias( tecnicas)?|conhecimentos)\b/],
  ['mentioned', /^(responsabilidades|atividades|o que voce (vai|ira) fazer|seu dia a dia|desafios|responsibilities|what you.?ll do|the role|sobre a (vaga|posicao)|about the (role|job))\b/],
  // what the company offers isn't asked of anyone: "english classes" there isn't a requirement
  ['ignore', /^(beneficios|o que oferecemos|oferecemos|remuneracao|benefits|perks|what we offer|sobre (nos|a empresa)|about (us|the company)|local|location|como se candidatar|how to apply)\b/],
];

function headerOf(line: string): Section | null {
  const flat = plain(line).replace(/[:\-–]+$/, '').trim();
  // a header is short; a long line that starts with "requisitos" is content
  if (flat.length > 60) return null;
  for (const [section, pattern] of HEADERS) if (pattern.test(flat)) return section;
  return null;
}

// "(desejável)", "é um diferencial", "nice to have" inside a line of the required list
const NICE_INLINE = /(desejavel|diferencial|nice to have|is a plus|a plus|bonus|preferencialmente|preferably)/;

const LEVELS: [Level, RegExp][] = [
  ['lead', /\b(tech lead|lider tecnico|staff|principal|head)\b/],
  ['senior', /\b(senior|sr)\b/],
  ['mid', /\b(pleno|mid[- ]?level|pl)\b/],
  ['junior', /\b(junior|jr|entry[- ]level)\b/],
  ['intern', /\b(estagio|estagiario|intern|internship|trainee)\b/],
];

export function readJob(text: string): Job {
  const found = new Map<string, JobSkill>();
  const rank: Record<Weight, number> = { required: 3, mentioned: 2, nice: 1 };
  let section: Section = 'mentioned';
  let years: number | null = null;

  for (const line of lines(text)) {
    const header = headerOf(line);
    if (header) {
      section = header;
      // "Requisitos: React, Node" on the same line as the header
      const rest = line.split(':').slice(1).join(':');
      if (!rest.trim()) continue;
    }
    if (section === 'ignore') continue;
    const flat = plain(line);

    const asked = flat.match(/(\d{1,2})\s*\+?\s*(?:anos|years?|yrs)\b/);
    if (asked && /(experiencia|experience|atuacao|atuando|working)/.test(flat)) {
      years = Math.max(years ?? 0, Number(asked[1]));
    }

    const weight: Weight = section === 'required' && NICE_INLINE.test(flat) ? 'nice' : section;
    for (const skill of skillsIn(line)) {
      const before = found.get(skill.id);
      // a skill asked in two places counts with the strongest of them
      if (!before || rank[weight] > rank[before.weight]) found.set(skill.id, { skill, weight, line });
    }
  }

  // the level comes from the title, which is usually the first lines
  const top = plain(lines(text).slice(0, 3).join(' '));
  const level = LEVELS.find(([, pattern]) => pattern.test(top))?.[0] ?? null;

  return { skills: [...found.values()], years, level };
}
