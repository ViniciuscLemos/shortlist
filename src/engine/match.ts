import { readJob, type Job, type JobSkill, type Level, type Weight } from './job';
import { readResume, type Evidence, type Resume } from './resume';
import { spelledAs } from './find';
import { plain } from './text';
import { WORDS, type Lang, type Words } from './words';

export interface SkillResult extends JobSkill {
  /** where the resume shows it, or null when it doesn't */
  evidence: Evidence | null;
  /** in the resume, but only in a list of skills: never shown being used */
  onlyListed: boolean;
}

export interface Check {
  id: string;
  ok: boolean;
  /** what to do about it, in a sentence; empty when ok */
  advice: string;
}

export interface Report {
  /** 0 to 100 */
  score: number;
  verdict: string;
  skills: SkillResult[];
  missing: SkillResult[];
  years: { asked: number | null; have: number };
  level: Level | null;
  checks: Check[];
  job: Job;
  resume: Resume;
}

const WEIGHT: Record<Weight, number> = { required: 3, mentioned: 2, nice: 1 };
// a skill only listed counts less than one shown in a job or project: anyone can type a list
const LISTED_ONLY = 0.6;

const ACTION_VERBS = /^(desenvolvi|criei|construi|implementei|liderei|reduzi|aumentei|automatizei|migrei|otimizei|entreguei|projetei|refatorei|integrei|lancei|coordenei|built|led|created|developed|reduced|increased|automated|designed|migrated|shipped|improved|launched|implemented|refactored|integrated|wrote|owned)\b/;
const WEAK = /^(responsavel por|responsible for|auxiliei|auxiliar|ajudei|participei|participacao|tarefas|duties|worked on|helped)\b/;

export function analyze(resumeText: string, jobText: string, now = new Date(), lang: Lang = 'en'): Report {
  const W = WORDS[lang];
  const job = readJob(jobText);
  const resume = readResume(resumeText, now);

  const skills: SkillResult[] = job.skills.map((js) => {
    const evidence = resume.evidence.get(js.skill.id) ?? null;
    const used = !!evidence && (evidence.sections.has('experience') || evidence.sections.has('projects'));
    return { ...js, evidence, onlyListed: !!evidence && !used };
  });

  const total = skills.reduce((sum, s) => sum + WEIGHT[s.weight], 0);
  const got = skills.reduce((sum, s) => sum + (s.evidence ? WEIGHT[s.weight] * (s.onlyListed ? LISTED_ONLY : 1) : 0), 0);
  const score = total ? Math.round((100 * got) / total) : 0;
  const missing = skills.filter((s) => !s.evidence);
  const years = { asked: job.years, have: Math.floor(resume.months / 12) };

  return {
    score,
    verdict: verdict(score, skills, missing, years, total, W),
    skills,
    missing,
    years,
    level: job.level,
    checks: checks(resume, skills, W),
    job,
    resume,
  };
}

function verdict(score: number, skills: SkillResult[], missing: SkillResult[], years: Report['years'], total: number, W: Words): string {
  if (!total) return W.nothingToCompare;
  const requiredMissing = missing.filter((s) => s.weight === 'required');
  const short = years.asked && years.have < years.asked ? W.short(years.asked, years.have) : '';
  const requiredListed = skills.filter((s) => s.weight === 'required' && s.onlyListed);
  if (score >= 75 && !requiredMissing.length) {
    if (requiredListed.length) return W.strongListed(requiredListed.map((s) => s.skill.name)) + short;
    return W.strongShown + short;
  }
  if (requiredMissing.length === 1) return W.oneMissing(requiredMissing[0].skill.name) + short;
  if (requiredMissing.length > 1) {
    return W.manyMissing(requiredMissing.length, requiredMissing.slice(0, 3).map((s) => s.skill.name), requiredMissing.length > 3) + short;
  }
  const listed = skills.filter((s) => s.onlyListed).length;
  if (listed) return W.someListed(listed) + short;
  return W.most + short;
}

function checks(resume: Resume, skills: SkillResult[], W: Words): Check[] {
  const out: Check[] = [];
  const add = (id: string, ok: boolean, advice: () => string) => out.push({ id, ok, advice: ok ? '' : advice() });

  const { contact } = resume;
  add('contact', contact.email && contact.phone, () => W.contact(contact.email, contact.phone));
  add('links', contact.linkedin || contact.github, () => W.links);
  add('experience', resume.sections.has('experience') || resume.sections.has('projects'), () => W.experience);

  if (resume.words > 900) add('length', false, () => W.tooLong(resume.words));
  else if (resume.words < 150) add('length', false, () => W.tooShort(resume.words));
  else add('length', true, () => '');

  const done = resume.doneLines;
  if (done.length) {
    const numbers = done.filter((l) => /\d/.test(l.replace(/\b(19|20)\d{2}\b/g, ''))).length;
    add('numbers', numbers / done.length >= 0.25, () => W.numbers(numbers, done.length));
    const weak = done.filter((l) => WEAK.test(plain(l)));
    add('weak', weak.length === 0, () => W.weak(weak.length, (weak[0] ?? '').split(/\s+/).slice(0, 3).join(' ')));
    const strong = done.filter((l) => ACTION_VERBS.test(plain(l))).length;
    add('verbs', strong / done.length >= 0.3, () => W.verbs);
  }

  // a filter that looks for "PostgreSQL" may not count "Postgres": write it the way the ad does
  const spelled = skills.flatMap((s) => {
    if (!s.evidence || s.weight === 'nice') return [];
    const theirs = spelledAs(s.line, s.skill.id);
    const yours = spelledAs(s.evidence.line, s.skill.id);
    return theirs && yours && variants(theirs, yours) ? [W.spelledPair(shown(theirs, s.line), shown(yours, s.evidence.line))] : [];
  });
  add('spelling', spelled.length === 0, () => W.spelling(spelled.slice(0, 3)));

  const listed = skills.filter((s) => s.onlyListed && s.weight !== 'nice');
  add('shown', listed.length === 0, () => W.shown(listed.map((s) => s.skill.name)));
  return out;
}

// two ways of writing the same name ("Postgres" and "PostgreSQL", "k8s" and "Kubernetes"),
// not two related things under one skill ("Scrum" and "agile methods")
function variants(a: string, b: string): boolean {
  const [x, y] = [a, b].map((s) => plain(s).replace(/[\s.\-/]/g, '')).sort((p, q) => p.length - q.length);
  if (x === y) return false;
  return y.startsWith(x) || x.length <= 3;
}

// the loose match comes back in plain form: find it again in the original line to quote it as written
function shown(match: string, line: string): string {
  const at = plain(line).indexOf(match);
  const same = at >= 0 && line.length === plain(line).length ? line.slice(at, at + match.length) : match;
  return `"${same}"`;
}
