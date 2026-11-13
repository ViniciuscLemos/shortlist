import { adTitle } from './ads';
import type { Report, SkillResult } from './match';
import type { Lang } from './words';

// A first draft of a cover letter, made from the comparison: the role, the skills the ad wants
// most with the line of the resume that shows each one, and the gaps said plainly instead of
// hidden. A draft to rewrite in your own voice, not a letter to send as it is: the page says so.

const WORDS = {
  en: {
    hello: 'Hello,',
    applying: (role: string) => (role ? `I'd like to apply for ${role}.` : "I'd like to apply for this position."),
    close: 'What the ad asks for most is close to what I have been doing:',
    gaps: (names: string) => `${names}: I haven't used ${names.includes(' and ') ? 'them' : 'it'} at work yet. I'd rather say so now, and it's where my first weeks would go.`,
    end: "I'd be glad to talk about it. Thank you for reading.",
    and: 'and',
    you: '[your name]',
  },
  pt: {
    hello: 'Olá,',
    applying: (role: string) => (role ? `Gostaria de me candidatar à vaga de ${role}.` : 'Gostaria de me candidatar a esta vaga.'),
    close: 'O que a vaga mais pede é próximo do que venho fazendo:',
    gaps: (names: string) => `${names}: ainda não usei no trabalho. Prefiro dizer agora, e é onde eu colocaria minhas primeiras semanas.`,
    end: 'Fico à disposição para conversar. Agradeço a leitura.',
    and: 'e',
    you: '[seu nome]',
  },
};

const join = (names: string[], and: string) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}` : names[0] ?? '';

// a bullet of the resume as a phrase: no dash in front, no full stop at the end, lower case
// at the start unless it's a name (React, AWS) or "I"
function phrase(line: string): string {
  const text = line.replace(/^[\s\-–—•*·]+/, '').replace(/[.;]+$/, '').trim();
  const first = text.split(/\s/)[0] ?? '';
  const keep = /^[A-Z0-9]{2,}/.test(first) || /[a-z][A-Z]/.test(first) || first === 'I' || /\./.test(first);
  return keep ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

// the first line of the resume when it looks like a name: two to five words, no digits or @
function nameOf(resume: string): string | null {
  const first = resume.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
  return /^[\p{L}'.-]+(\s+[\p{L}'.-]+){1,4}$/u.test(first) ? first : null;
}

// the role, from the ad's first short line, without "Vaga:" or "Job:" in front
function roleOf(job: string): string {
  return adTitle(job).replace(/^(vaga|job|position|cargo|role)\s*[:–-]\s*/i, '').trim();
}

const used = (s: SkillResult) => !!s.evidence && !s.onlyListed &&
  (s.evidence.sections.has('experience') || s.evidence.sections.has('projects'));

// The letter goes in the language of the ad, whatever language the page is in: an ad in
// Portuguese gets a letter in Portuguese. Counted on small words only one of them uses a lot.
export function langOf(text: string, fallback: Lang = 'en'): Lang {
  const count = (re: RegExp) => (text.toLowerCase().match(re) ?? []).length;
  // whole words only, accents included (\b stops at "ê" and would split "experiência")
  const pt = count(/(?<!\p{L})(de|para|com|você|vaga|requisitos|experiência|conhecimento|desejável|não|em|uma|nosso|nossa)(?!\p{L})/gu);
  const en = count(/(?<!\p{L})(the|and|with|you|for|our|requirements|experience|nice|have|of|in|to)(?!\p{L})/gu);
  if (pt === en) return fallback;
  return pt > en ? 'pt' : 'en';
}

export function coverLetter(report: Report, resume: string, job: string, lang: Lang = 'en'): string {
  const W = WORDS[langOf(job, lang)];
  // what the ad wants most and the resume shows being used: required first, three lines at
  // most, skills shown by the same line of the resume told once ("React and TypeScript: ...")
  const shown = [...report.skills.filter((s) => s.weight === 'required'), ...report.skills.filter((s) => s.weight !== 'required')]
    .filter(used);
  const byLine = new Map<string, string[]>();
  for (const s of shown) {
    const line = s.evidence!.line;
    if (!byLine.has(line) && byLine.size >= 3) continue;
    byLine.set(line, [...(byLine.get(line) ?? []), s.skill.name]);
  }
  const gaps = report.skills.filter((s) => s.weight === 'required' && !s.evidence).slice(0, 2).map((s) => s.skill.name);

  const parts = [W.hello, W.applying(roleOf(job))];
  if (byLine.size) {
    parts.push([W.close, ...[...byLine].map(([line, names]) => `- ${join(names, W.and)}: ${phrase(line)}.`)].join('\n'));
  }
  if (gaps.length) parts.push(W.gaps(join(gaps, W.and)));
  parts.push(W.end, nameOf(resume) ?? W.you);
  return parts.join('\n\n');
}
