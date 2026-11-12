import type { Skill, SkillKind } from './skills';
import type { Lang } from './words';

// A line to start from when the resume doesn't show something the ad asks for. Not a line to
// paste: the brackets are what only the person knows, and if they never used it, the honest
// fix is to leave it out. The shape is the one recruiters read fastest: what, with what, and
// what came of it.

const LINES: Record<Lang, Record<SkillKind, (name: string) => string>> = {
  en: {
    language: (n) => `Built [what: a feature, a service, a tool] in ${n}, [what came of it: users, time saved, errors down by x%].`,
    framework: (n) => `Built [what: a screen, an API, a whole app] with ${n}, [what came of it: shipped in x weeks, used by y people].`,
    data: (n) => `Used ${n} to [store, query or analyze what], [what came of it: a report in minutes instead of hours, a query x times faster].`,
    cloud: (n) => `Put [what] in production on ${n}, [what came of it: deploys in x minutes, cost down by y%, no downtime in z months].`,
    practice: (n) => `Applied ${n} in [which project or team], [what came of it: fewer bugs in production, releases every x days].`,
    soft: (n) => `[A situation that shows ${n.toLowerCase()}: led, taught, negotiated, solved what], [with whom], [what came of it].`,
    tongue: (n) => `${n}: [level, like advanced or fluent] — [where it was used: meetings with clients abroad, docs, a stay].`,
  },
  pt: {
    language: (n) => `Desenvolvi [o quê: uma funcionalidade, um serviço, uma ferramenta] em ${n}, [resultado: usuários, tempo poupado, erros caíram x%].`,
    framework: (n) => `Construí [o quê: uma tela, uma API, um app inteiro] com ${n}, [resultado: entregue em x semanas, usado por y pessoas].`,
    data: (n) => `Usei ${n} para [guardar, consultar ou analisar o quê], [resultado: um relatório em minutos em vez de horas, uma consulta x vezes mais rápida].`,
    cloud: (n) => `Coloquei [o quê] em produção na ${n}, [resultado: deploy em x minutos, custo y% menor, sem queda em z meses].`,
    practice: (n) => `Apliquei ${n} em [qual projeto ou time], [resultado: menos bugs em produção, entregas a cada x dias].`,
    soft: (n) => `[Uma situação que mostra ${n.toLowerCase()}: liderei, ensinei, negociei, resolvi o quê], [com quem], [resultado].`,
    tongue: (n) => `${n}: [nível, como avançado ou fluente] — [onde usou: reuniões com clientes de fora, documentação, intercâmbio].`,
  },
};

export function suggestLine(skill: Skill, lang: Lang = 'en'): string {
  return LINES[lang][skill.kind](skill.name);
}
