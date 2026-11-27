import { describe, expect, it } from 'vitest';
import { skillsIn } from './find';
import { readJob } from './job';
import { analyze } from './match';
import { reportText } from './plaintext';
import { experienceMonths, readResume } from './resume';
import { SAMPLE_JOB, SAMPLE_RESUME } from './samples';

const ids = (line: string) => skillsIn(line).map((s) => s.id).sort();
const NOW = new Date(2026, 10, 7);

describe('finding skills in a line', () => {
  it('reads the usual spellings', () => {
    expect(ids('Node.js, NodeJS e node')).toEqual(['node']);
    expect(ids('ReactJS e React Native')).toEqual(['react', 'react-native']);
    expect(ids('C#, C++ e C')).toEqual(['c', 'cpp', 'csharp']);
    expect(ids('APIs RESTful com Express')).toEqual(['express', 'rest']);
    expect(ids('testes unitários e TDD')).toEqual(['tests']);
  });

  it("doesn't see skills inside other words or in plain English", () => {
    expect(ids('JavaScript')).toEqual(['javascript']);
    expect(ids('I go to the office to excel at the rest of the work')).toEqual([]);
    // the price of matching "Express" written the technical way: at the start of a sentence it counts
    expect(ids('express yourself, swift answers')).toEqual([]);
    expect(ids('Cientista de dados')).toEqual([]);
  });

  it('knows the data tools by their everyday names', () => {
    expect(ids('pipelines de dados com PySpark no Databricks e Airflow')).toEqual(['airflow', 'etl', 'spark']);
    expect(ids('modelos em dbt sobre o BigQuery')).toEqual(['dbt', 'warehouse']);
    expect(ids('Python e R para estatística')).toEqual(['python', 'r', 'statistics']);
  });

  it('knows the test tools of each stack', () => {
    expect(ids('JUnit 5 e Mockito no back, pytest nos scripts e Vitest no front')).toEqual(['junit', 'mockito', 'pytest', 'vitest']);
    expect(ids('servidores configurados com Ansible e Terraform')).toEqual(['ansible', 'terraform']);
  });

  it('a single letter only counts written as a name', () => {
    // "r" is a letter in plenty of places; "R" next to other tools is the language
    expect(ids('r. das flores, 120')).toEqual([]);
  });
});

describe('reading the job ad', () => {
  const job = readJob(SAMPLE_JOB);
  const weight = (id: string) => job.skills.find((s) => s.skill.id === id)?.weight;

  it('tells what is required from what is a plus', () => {
    expect(weight('react')).toBe('required');
    expect(weight('postgres')).toBe('required');
    expect(weight('tests')).toBe('required');
    expect(weight('kubernetes')).toBe('nice');
    expect(weight('graphql')).toBe('nice');
    // "metodologias ágeis" is in the description of the role, not in the requirements
    expect(weight('agile')).toBe('mentioned');
  });

  it("doesn't take the benefits as requirements", () => {
    expect(weight('english')).toBeUndefined();
  });

  it('finds the years and the level', () => {
    expect(job.years).toBe(3);
    expect(job.level).toBe('mid');
  });

  it('knows the other ways ads name their sections', () => {
    const ad = readJob([
      'Para essa vaga:', '- Java e Spring',
      'Será um plus:', '- Kafka',
      'Nice-to-have', '- Terraform',
      'O que temos pra você:', '- Aulas de inglês',
    ].join('\n'));
    const w = (id: string) => ad.skills.find((s) => s.skill.id === id)?.weight;
    expect([w('java'), w('spring')]).toEqual(['required', 'required']);
    expect([w('kafka'), w('terraform')]).toEqual(['nice', 'nice']);
    expect(w('english')).toBeUndefined();
  });

  it('a plus written inside the requirements is still a plus', () => {
    const inline = readJob('Requisitos:\n- Python\n- Docker (desejável)');
    expect(inline.skills.find((s) => s.skill.id === 'docker')?.weight).toBe('nice');
    expect(inline.skills.find((s) => s.skill.id === 'python')?.weight).toBe('required');
  });

  it('works in English too', () => {
    const en = readJob('Senior Backend Engineer\n\nRequirements\n- 5+ years of experience with Go\n\nNice to have\n- Kafka');
    expect(en.level).toBe('senior');
    expect(en.years).toBe(5);
    expect(en.skills.map((s) => [s.skill.id, s.weight])).toEqual([['go', 'required'], ['kafka', 'nice']]);
  });
});

describe('reading the resume', () => {
  const resume = readResume(SAMPLE_RESUME, NOW);

  it('knows where each skill shows up', () => {
    expect([...resume.evidence.get('react')!.sections]).toEqual(expect.arrayContaining(['experience', 'skills']));
    expect([...resume.evidence.get('aws')!.sections]).toEqual(['skills']);
    expect(resume.evidence.get('react')!.line).toContain('checkout');
  });

  it('adds up the experience without counting overlaps twice', () => {
    // mar 2023 - nov 2026 (45 months) + jan 2021 - feb 2023 (26 months)
    expect(resume.months).toBe(71);
    expect(experienceMonths('jan 2020 - dez 2021\n06/2021 - 03/2022', NOW)).toBe(27);
    expect(experienceMonths('2019 - 2020', NOW)).toBe(13);
    // the dashes Word and Google Docs put in by themselves
    expect(experienceMonths('01/2020 – 12/2021', NOW)).toBe(24);
    expect(experienceMonths('mar 2025 — atual', NOW)).toBe(21);
    expect(experienceMonths('jun 2026 - em andamento', NOW)).toBe(6);
  });

  it('knows other common names for the sections', () => {
    const other = readResume(
      'Trajetória profissional\nDev na Loja X, mar 2024 - atual, APIs em Node.js\n'
      + 'Hard skills:\nDocker, PostgreSQL\n'
      + 'Work history\nIntern at Y, 2022 - 2023, React\n',
      NOW,
    );
    expect([...other.sections].sort()).toEqual(['experience', 'skills']);
    expect([...other.evidence.get('node')!.sections]).toEqual(['experience']);
    expect([...other.evidence.get('docker')!.sections]).toEqual(['skills']);
    expect([...other.evidence.get('react')!.sections]).toEqual(['experience']);
  });

  it('finds the contact', () => {
    expect(resume.contact).toEqual({ email: true, phone: true, linkedin: true, github: true });
  });
});

describe('the match', () => {
  const report = analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW);
  const result = (id: string) => report.skills.find((s) => s.skill.id === id)!;

  it('scores and names what is missing', () => {
    expect(report.missing.map((s) => s.skill.id)).toEqual(expect.arrayContaining(['kubernetes', 'graphql', 'next']));
    expect(report.score).toBeGreaterThan(60);
    expect(report.score).toBeLessThan(90);
    expect(report.years).toEqual({ asked: 3, have: 5 });
  });

  it('says when a requirement is there but only listed', () => {
    expect(report.verdict).toContain('AWS only in a list');
  });

  it('a skill only in the list counts less, and says so', () => {
    expect(result('aws').onlyListed).toBe(true);
    expect(result('react').onlyListed).toBe(false);
    const shown = report.checks.find((c) => c.id === 'shown')!;
    expect(shown.ok).toBe(false);
    expect(shown.advice).toContain('AWS');
  });

  it('points at the weak lines', () => {
    const weak = report.checks.find((c) => c.id === 'weak')!;
    expect(weak.ok).toBe(false);
    expect(weak.advice).toContain('2 lines');
    // quoted as written, accents and all
    expect(weak.advice).toContain('"Responsável por manter…"');
  });

  it('asks to write a skill the way the ad does', () => {
    const r = analyze('Experiência\n- Built the reports on Postgres and k8s', 'Requisitos:\n- PostgreSQL\n- Kubernetes', NOW);
    const spelling = r.checks.find((c) => c.id === 'spelling')!;
    expect(spelling.ok).toBe(false);
    expect(spelling.advice).toContain('They write "PostgreSQL", you write "Postgres"');
    expect(spelling.advice).toContain('"Kubernetes", you write "k8s"');
    const same = analyze('Experiência\n- Built it on postgresql', 'Requisitos:\n- PostgreSQL', NOW);
    expect(same.checks.find((c) => c.id === 'spelling')!.ok).toBe(true);
  });

  it('an empty ad says there is nothing to compare', () => {
    expect(analyze(SAMPLE_RESUME, 'Vaga de atendimento ao público').verdict).toContain('nothing to compare');
  });
});

describe('the report as text', () => {
  const text = reportText(analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW), { shown: 'Skills shown' });

  it('lists every skill with a mark', () => {
    expect(text).toMatch(/^\d+\/100\. /);
    expect(text).toContain('✓ React');
    expect(text).toContain('~ AWS (only in a list)');
    expect(text).toContain('✗ Kubernetes (missing)');
  });

  it('ends with what to fix, numbered', () => {
    expect(text).toMatch(/To fix:\n  1\. /);
    expect(text).toContain('Skills shown. Agile, AWS');
  });
});

describe('in Portuguese', () => {
  const report = analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW, 'pt');

  it('says the same thing, with the same score', () => {
    expect(report.score).toBe(analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW).score);
    expect(report.verdict).toBe('Combina bem: todo requisito está no currículo, mas AWS só numa lista.');
  });

  it('the advice reads naturally, singular and plural', () => {
    const weak = report.checks.find((c) => c.id === 'weak')!;
    expect(weak.advice).toContain('2 linhas começam com "Responsável por manter…"');
    const shown = report.checks.find((c) => c.id === 'shown')!;
    expect(shown.advice).toContain('Agile, AWS são pedidos mas só aparecem numa lista');
    const r = analyze('Experiência\n- Built the reports on Postgres', 'Requisitos:\n- PostgreSQL', NOW, 'pt');
    expect(r.checks.find((c) => c.id === 'spelling')!.advice).toContain('Eles escrevem "PostgreSQL", você escreve "Postgres"');
  });
});


describe('a line to start from', () => {
  it('has the skill in it and brackets to fill, in both languages', async () => {
    const { suggestLine } = await import('./suggest');
    const { SKILLS } = await import('./skills');
    for (const skill of SKILLS) {
      for (const lang of ['en', 'pt'] as const) {
        const line = suggestLine(skill, lang);
        expect(line.toLowerCase()).toContain(skill.name.toLowerCase());
        expect(line).toMatch(/\[[^\]]+\]/);
      }
    }
    expect(suggestLine(SKILLS.find((s) => s.id === 'react')!, 'pt')).toMatch(/^Construí .* com React/);
  });
});

describe('several ads against one resume', () => {
  it('ranks them by score and says what each one misses', async () => {
    const { keepAd, rankAds, adTitle } = await import('./ads');
    const { SAMPLE_JOB, SAMPLE_RESUME } = await import('./samples');
    const java = 'Backend developer (Java)\nRequirements:\n- Java\n- Spring Boot\n- Kafka\n- 5+ years';
    let ads = keepAd([], SAMPLE_JOB, 'a');
    ads = keepAd(ads, java, 'b');
    // the same ad again, with different spacing, isn't kept twice
    expect(keepAd(ads, `  ${java.replace(/\n/g, '\n\n')} `, 'c')).toHaveLength(2);
    const ranked = rankAds(SAMPLE_RESUME, ads);
    expect(ranked.map((r) => r.ad.id)).toEqual(['a', 'b']);
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
    expect(ranked[1]!.missing).toEqual(expect.arrayContaining(['Java', 'Kafka']));
    expect(ranked[1]!.required.total).toBeGreaterThanOrEqual(3);
    expect(adTitle(java)).toBe('Backend developer (Java)');
    expect(adTitle('x'.repeat(200))).toHaveLength(70);
  });
});

describe('an ad outside tech', () => {
  const ad = `Estágio em Nutrição
Requisitos:
- Cursando Nutrição a partir do 5º semestre
- Conhecimento em avaliação nutricional
- Cálculo de dietas e cardápios
- Atendimento ambulatorial
- Pacote Office (Excel)`;
  const nutrition = `Experiência
- Estágio em nutrição clínica no Hospital São Lucas (03/2025 - atual): avaliação nutricional de pacientes internados e elaboração de dietas e cardápios
Formação
- Nutrição, Universidade Mackenzie, 6º semestre
Habilidades
- Excel`;
  const dev = `Experiência
- Desenvolvi APIs em Node.js e React (2022 - atual)
Habilidades
- Excel, TypeScript`;

  it("doesn't call it a full match because Excel was the only skill it knew", () => {
    const r = analyze(dev, ad, NOW, 'pt');
    expect(r.loose.length).toBe(4);
    expect(r.loose.every((l) => !l.found)).toBe(true);
    expect(r.score).toBeLessThan(30);
    expect(r.verdict).toContain('pelas próprias palavras');
    expect(r.verdict).not.toContain('Tem tudo');
  });

  it('compares each requirement by its words', () => {
    const r = analyze(nutrition, ad, NOW);
    const found = (start: string) => r.loose.find((l) => l.line.startsWith(start))!.found;
    expect(found('Conhecimento em avaliação')).toBe(true);
    expect(found('Cálculo de dietas')).toBe(true);
    expect(found('Cursando Nutrição')).toBe(true);
    expect(found('Atendimento ambulatorial')).toBe(false);
    expect(r.score).toBeGreaterThan(60);
    expect(r.verdict).toContain('4 of 5');
  });

  it('a tech ad with a line or two outside the list is scored as before', () => {
    const r = analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW);
    expect(r.loose).toEqual([]);
  });

  it("doesn't suggest a GitHub for a job outside tech", () => {
    const links = analyze(nutrition, ad, NOW).checks.find((c) => c.id === 'links')!;
    expect(links.advice).toContain('LinkedIn');
    expect(links.advice).not.toContain('GitHub');
  });

  it('the text copy lists those lines too', () => {
    expect(reportText(analyze(nutrition, ad, NOW), {})).toContain('✗ Atendimento ambulatorial');
  });
});
