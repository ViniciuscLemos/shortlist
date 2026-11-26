import { plain } from './text';

// For the requirements the skill list doesn't know ("avaliação nutricional", "cálculo de
// dietas", "CNH categoria B"): compare the line by its own words. Rough on purpose, it only
// has to tell "the resume talks about this" from "it doesn't".

// words that say nothing about what is asked: "conhecimento em", "experiência com", "boa"...
const FILLER = new Set(`
a o as os um uma uns umas de da do das dos em no na nos nas com sem para pra por pelo pela
e ou que se ser estar ter como sua seu suas seus ao aos mais muito bem boa bom boas bons
conhecimento conhecimentos experiencia experiencias capacidade habilidade habilidades
dominio nocao nocoes familiaridade vivencia pratica area areas nivel basico basica
intermediario intermediaria avancado avancada cursando cursar formacao completo completa
superior graduacao ensino curso disponibilidade desejavel obrigatorio atuar atuacao
the an of in on at to for with and or be have has having good strong solid basic
knowledge experience ability skills skill familiarity understanding working level
degree studying available required preferred plus
`.trim().split(/\s+/));

// "nutricional" and "nutrição" share the start; so do "dietas" and "dieta"
const stem = (word: string) => word.slice(0, 6);

export function contentWords(line: string): string[] {
  const seen = new Set<string>();
  for (const word of plain(line).split(/[\s./\-]+/)) {
    if (word.length < 4 || /\d/.test(word) || FILLER.has(word)) continue;
    seen.add(stem(word));
  }
  return [...seen];
}

export function resumeWords(text: string): Set<string> {
  return new Set(contentWords(text));
}

/** A requirement line counts as there when at least half of its words are in the resume. */
export function lineFound(line: string, resume: Set<string>): boolean {
  const words = contentWords(line);
  if (!words.length) return false;
  return words.filter((w) => resume.has(w)).length * 2 >= words.length;
}
