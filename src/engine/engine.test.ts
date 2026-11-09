import { describe, expect, it } from 'vitest';
import { skillsIn } from './find';
import { readJob } from './job';
import { analyze } from './match';
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

  it('an empty ad says there is nothing to compare', () => {
    expect(analyze(SAMPLE_RESUME, 'Vaga de atendimento ao público').verdict).toContain('nothing to compare');
  });
});
