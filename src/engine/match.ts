import { readJob, type Job, type JobSkill, type Level, type Weight } from './job';
import { readResume, type Evidence, type Resume } from './resume';
import { plain } from './text';

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

export function analyze(resumeText: string, jobText: string, now = new Date()): Report {
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
    verdict: verdict(score, skills, missing, years, total),
    skills,
    missing,
    years,
    level: job.level,
    checks: checks(resume, skills),
    job,
    resume,
  };
}

function verdict(score: number, skills: SkillResult[], missing: SkillResult[], years: Report['years'], total: number): string {
  if (!total) return "The ad doesn't mention any skill this knows yet, so there's nothing to compare.";
  const requiredMissing = missing.filter((s) => s.weight === 'required');
  const short = years.asked && years.have < years.asked ? ` They ask for ${years.asked} years and the resume shows about ${years.have || 'less than one'}.` : '';
  const requiredListed = skills.filter((s) => s.weight === 'required' && s.onlyListed);
  if (score >= 75 && !requiredMissing.length) {
    if (requiredListed.length) {
      const names = requiredListed.map((s) => s.skill.name).join(', ');
      return `A strong match: every requirement is in the resume, though ${names} only in a list.${short}`;
    }
    return `A strong match: every requirement is in the resume, and shown in what you did.${short}`;
  }
  if (requiredMissing.length === 1) return `Close: one requirement isn't in the resume (${requiredMissing[0].skill.name}).${short}`;
  if (requiredMissing.length > 1) {
    const names = requiredMissing.slice(0, 3).map((s) => s.skill.name);
    return `${requiredMissing.length} requirements aren't in the resume: ${names.join(', ')}${requiredMissing.length > 3 ? '…' : ''}.${short}`;
  }
  const listed = skills.filter((s) => s.onlyListed).length;
  if (listed) return `Everything asked is there, but ${listed} of it only in a list, never shown in a job or project.${short}`;
  return `Most of what they ask is there.${short}`;
}

function checks(resume: Resume, skills: SkillResult[]): Check[] {
  const out: Check[] = [];
  const add = (id: string, ok: boolean, advice: string) => out.push({ id, ok, advice: ok ? '' : advice });

  const { contact } = resume;
  add('contact', contact.email && contact.phone,
    `Put ${[!contact.email && 'an email', !contact.phone && 'a phone number'].filter(Boolean).join(' and ')} at the top. A recruiter who likes the resume needs a way to call.`);
  add('links', contact.linkedin || contact.github,
    'Add a LinkedIn or GitHub link. For a developer, a GitHub with real projects often says more than the resume.');
  add('experience', resume.sections.has('experience') || resume.sections.has('projects'),
    'There\'s no "Experience" or "Projects" section that this could find. Give what you did its own heading, so it stands out from the rest.');

  if (resume.words > 900) add('length', false, `It's about ${resume.words} words. One or two pages is what gets read; cut the oldest jobs to a line each.`);
  else if (resume.words < 150) add('length', false, `It's only about ${resume.words} words. Say what you built, with what, and what came out of it.`);
  else add('length', true, '');

  const done = resume.doneLines;
  if (done.length) {
    const numbers = done.filter((l) => /\d/.test(l.replace(/\b(19|20)\d{2}\b/g, ''))).length;
    add('numbers', numbers / done.length >= 0.25,
      `Only ${numbers} of ${done.length} lines about your work have a number. "Cut the load time from 4 s to 1 s" or "used by 300 people a day" is what people remember.`);
    const weak = done.filter((l) => WEAK.test(plain(l)));
    add('weak', weak.length === 0,
      `${weak.length} line${weak.length === 1 ? ' starts' : 's start'} like "${(weak[0] ?? '').split(/\s+/).slice(0, 3).join(' ')}…". Say what you did instead: "built", "reduced", "automated".`);
    const strong = done.filter((l) => ACTION_VERBS.test(plain(l))).length;
    add('verbs', strong / done.length >= 0.3,
      'Few lines start with what you did. Start them with a verb in the past ("developed", "migrated", "led") so the reader sees the action first.');
  }

  const listed = skills.filter((s) => s.onlyListed && s.weight !== 'nice');
  add('shown', listed.length === 0,
    `${listed.map((s) => s.skill.name).join(', ')} ${listed.length === 1 ? 'is' : 'are'} asked for but only appear${listed.length === 1 ? 's' : ''} in a list. Mention ${listed.length === 1 ? 'it' : 'them'} in a job or project where you actually used ${listed.length === 1 ? 'it' : 'them'}.`);
  return out;
}
