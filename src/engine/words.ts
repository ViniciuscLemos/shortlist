// What the report says, in English and in Portuguese. Kept apart from the rules in match.ts,
// so changing a sentence can't change a score, and the two languages say the same thing.

export type Lang = 'en' | 'pt';

const list = (names: string[], and: string) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}`;

export interface Words {
  nothingToCompare: string;
  short(asked: number, have: number): string;
  strongListed(names: string[]): string;
  strongShown: string;
  oneMissing(name: string): string;
  manyMissing(count: number, names: string[], more: boolean): string;
  someListed(count: number): string;
  most: string;

  contact(email: boolean, phone: boolean): string;
  links: string;
  experience: string;
  tooLong(words: number): string;
  tooShort(words: number): string;
  numbers(have: number, of: number): string;
  weak(count: number, start: string): string;
  verbs: string;
  spelledPair(theirs: string, yours: string): string;
  spelling(pairs: string[]): string;
  shown(names: string[]): string;
}

const en: Words = {
  nothingToCompare: "The ad doesn't mention any skill this knows yet, so there's nothing to compare.",
  short: (asked, have) => ` They ask for ${asked} years and the resume shows about ${have || 'less than one'}.`,
  strongListed: (names) => `A strong match: every requirement is in the resume, though ${names.join(', ')} only in a list.`,
  strongShown: 'A strong match: every requirement is in the resume, and shown in what you did.',
  oneMissing: (name) => `Close: one requirement isn't in the resume (${name}).`,
  manyMissing: (count, names, more) => `${count} requirements aren't in the resume: ${names.join(', ')}${more ? '…' : ''}.`,
  someListed: (count) => `Everything asked is there, but ${count} of it only in a list, never shown in a job or project.`,
  most: 'Most of what they ask is there.',

  contact: (email, phone) =>
    `Put ${list([!email && 'an email', !phone && 'a phone number'].filter(Boolean) as string[], 'and')} at the top. A recruiter who likes the resume needs a way to call.`,
  links: 'Add a LinkedIn or GitHub link. For a developer, a GitHub with real projects often says more than the resume.',
  experience: 'There\'s no "Experience" or "Projects" section that this could find. Give what you did its own heading, so it stands out from the rest.',
  tooLong: (words) => `It's about ${words} words. One or two pages is what gets read; cut the oldest jobs to a line each.`,
  tooShort: (words) => `It's only about ${words} words. Say what you built, with what, and what came out of it.`,
  numbers: (have, of) => `Only ${have} of ${of} lines about your work have a number. "Cut the load time from 4 s to 1 s" or "used by 300 people a day" is what people remember.`,
  weak: (count, start) => `${count} line${count === 1 ? ' starts' : 's start'} like "${start}…". Say what you did instead: "built", "reduced", "automated".`,
  verbs: 'Few lines start with what you did. Start them with a verb in the past ("developed", "migrated", "led") so the reader sees the action first.',
  spelledPair: (theirs, yours) => `they write ${theirs}, you write ${yours}`,
  spelling: (pairs) => `${cap(pairs.join('; '))}. Some recruiting systems only match the exact word, so use theirs at least once.`,
  shown: (names) => {
    const one = names.length === 1;
    return `${names.join(', ')} ${one ? 'is' : 'are'} asked for but only appear${one ? 's' : ''} in a list. Mention ${one ? 'it' : 'them'} in a job or project where you actually used ${one ? 'it' : 'them'}.`;
  },
};

const pt: Words = {
  nothingToCompare: 'A vaga não cita nenhuma habilidade que isto conheça ainda, então não há o que comparar.',
  short: (asked, have) => ` Pedem ${asked} anos e o currículo mostra uns ${have || 'menos de um'}.`,
  strongListed: (names) => `Combina bem: todo requisito está no currículo, mas ${names.join(', ')} só numa lista.`,
  strongShown: 'Combina bem: todo requisito está no currículo, e aparece no que você fez.',
  oneMissing: (name) => `Perto: falta um requisito no currículo (${name}).`,
  manyMissing: (count, names, more) => `Faltam ${count} requisitos no currículo: ${names.join(', ')}${more ? '…' : ''}.`,
  someListed: (count) => `Tem tudo o que pedem, mas ${count} só numa lista, sem aparecer em nenhum trabalho ou projeto.`,
  most: 'A maior parte do que pedem está lá.',

  contact: (email, phone) =>
    `Coloque ${list([!email && 'um e-mail', !phone && 'um telefone'].filter(Boolean) as string[], 'e')} no topo. Quem gostar do currículo precisa ter como ligar.`,
  links: 'Coloque um link do LinkedIn ou do GitHub. Pra quem é dev, um GitHub com projetos de verdade muitas vezes diz mais que o currículo.',
  experience: 'Não achei uma seção de "Experiência" ou "Projetos". Dê ao que você fez um título próprio, pra se destacar do resto.',
  tooLong: (words) => `Tem umas ${words} palavras. Uma ou duas páginas é o que se lê; deixe os trabalhos mais antigos com uma linha cada.`,
  tooShort: (words) => `Tem só umas ${words} palavras. Diga o que você construiu, com o quê, e o que saiu disso.`,
  numbers: (have, of) => `Só ${have} de ${of} linhas sobre o seu trabalho têm um número. "Reduzi o carregamento de 4 s pra 1 s" ou "usado por 300 pessoas por dia" é o que fica na memória.`,
  weak: (count, start) => `${count} linha${count === 1 ? ' começa' : 's começam'} com "${start}…". Diga o que você fez: "desenvolvi", "reduzi", "automatizei".`,
  verbs: 'Poucas linhas começam com o que você fez. Comece com um verbo no passado ("desenvolvi", "migrei", "liderei"), pra quem lê ver a ação primeiro.',
  spelledPair: (theirs, yours) => `eles escrevem ${theirs}, você escreve ${yours}`,
  spelling: (pairs) => `${cap(pairs.join('; '))}. Alguns sistemas de recrutamento só reconhecem a palavra exata, então use a deles pelo menos uma vez.`,
  shown: (names) => {
    const one = names.length === 1;
    return `${names.join(', ')} ${one ? 'é pedido' : 'são pedidos'} mas só aparece${one ? '' : 'm'} numa lista. Cite ${one ? 'isso' : 'eles'} num trabalho ou projeto em que você usou de verdade.`;
  },
};

export const WORDS: Record<Lang, Words> = { en, pt };

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
