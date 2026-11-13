import { describe, expect, it } from 'vitest';
import { coverLetter } from './letter';
import { analyze } from './match';
import { SAMPLE_JOB, SAMPLE_RESUME } from './samples';
import { keepVersion, scoreVersions } from './versions';

const NOW = new Date('2026-11-13T12:00:00Z');

describe('a cover letter to start from', () => {
  const report = analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW, 'pt');
  const letter = coverLetter(report, SAMPLE_RESUME, SAMPLE_JOB, 'pt');

  it('names the role and signs with the name on the resume', () => {
    expect(letter).toContain('à vaga de Pessoa Desenvolvedora Full-stack Pleno.');
    expect(letter.trim().split('\n').pop()).toBe('Camila Duarte');
  });

  it('shows the required skills with the line that proves them, one line told once', () => {
    expect(letter).toContain('- TypeScript e React: desenvolvi o novo checkout em React e TypeScript, que reduziu o abandono de carrinho em 18%.');
    expect(letter).toContain('- Node.js, REST APIs e PostgreSQL: criei APIs REST');
    expect(letter.match(/^- /gm)).toHaveLength(3);
  });

  it("doesn't call a gap what the resume has, even only in its list", () => {
    // AWS is in Camila's list of skills: not shown being used, but not missing either
    expect(letter).not.toContain('ainda não usei');
  });

  it('goes in the language of the ad, whatever the page is in', () => {
    const fromEnglishPage = coverLetter(analyze(SAMPLE_RESUME, SAMPLE_JOB, NOW, 'en'), SAMPLE_RESUME, SAMPLE_JOB, 'en');
    expect(fromEnglishPage).toContain('Gostaria de me candidatar');
    expect(fromEnglishPage).toContain('- TypeScript e React:');
  });

  it('in English, and without a name to sign', () => {
    const en = coverLetter(analyze('Experience\n- Built a dashboard in React used by 300 people', 'Frontend developer\nRequirements\n- React\n- Go', NOW), '', 'Frontend developer', 'en');
    expect(en).toContain("I'd like to apply for Frontend developer.");
    expect(en).toContain('- React: built a dashboard in React used by 300 people.');
    expect(en).toContain("Go: I haven't used it at work yet.");
    expect(en.endsWith('[your name]')).toBe(true);
  });
});

describe('versions of the resume', () => {
  it('keeps each different one, newest first, and not the same twice', () => {
    let v = keepVersion([], 'first', new Date(1));
    v = keepVersion(v, 'first ', new Date(2));
    expect(v).toHaveLength(1);
    v = keepVersion(v, 'second', new Date(3));
    v = keepVersion(v, 'first', new Date(4));
    expect(v.map((x) => x.text)).toEqual(['first', 'second']);
    for (let i = 0; i < 10; i++) v = keepVersion(v, `v${i}`, new Date(10 + i));
    expect(v).toHaveLength(8);
  });

  it('scores each against the ad and says what each one started showing', () => {
    const before = SAMPLE_RESUME.replace(/.*GitHub Actions.*\n/, '');
    const versions = keepVersion(keepVersion([], before, new Date(1)), SAMPLE_RESUME, new Date(2));
    const [now, then] = scoreVersions(versions, SAMPLE_JOB, NOW, 'pt');
    expect(now!.score).toBeGreaterThan(then!.score);
    expect(now!.gained.length).toBeGreaterThan(0);
    expect(then!.gained).toEqual([]);
  });
});
