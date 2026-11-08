import { useMemo, useState } from 'react';
import type { Weight } from './engine/job';
import { analyze, type Report, type SkillResult } from './engine/match';
import { SAMPLE_JOB, SAMPLE_RESUME } from './engine/samples';
import { pdfText } from './pdf';

// the texts stay in this browser between visits, and nowhere else
function remembered(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private window: it just won't be there next time
  }
}

export default function App() {
  const [resume, setResume] = useState(() => remembered('shortlist.resume'));
  const [job, setJob] = useState(() => remembered('shortlist.job'));
  const [report, setReport] = useState<Report | null>(null);
  const [reading, setReading] = useState('');

  const ready = resume.trim().length > 40 && job.trim().length > 40;

  function compare() {
    remember('shortlist.resume', resume);
    remember('shortlist.job', job);
    setReport(analyze(resume, job));
    requestAnimationFrame(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }));
  }

  async function openPdf(file: File | undefined) {
    if (!file) return;
    setReading(`Reading ${file.name}…`);
    try {
      setResume(await pdfText(file));
      setReading('');
    } catch (e) {
      setReading(e instanceof Error && e.message.includes('scan') ? e.message : "Couldn't read that PDF. Paste the text instead.");
    }
  }

  function example() {
    setResume(SAMPLE_RESUME);
    setJob(SAMPLE_JOB);
    setReport(analyze(SAMPLE_RESUME, SAMPLE_JOB));
  }

  const words = useMemo(() => ({
    resume: resume.trim() ? resume.trim().split(/\s+/).length : 0,
    job: job.trim() ? job.trim().split(/\s+/).length : 0,
  }), [resume, job]);

  return (
    <div className="page">
      <header className="masthead">
        <p className="wordmark">shortlist</p>
        <h1>Read your resume the way the person hiring will.</h1>
        <p className="lede">
          Paste your resume and the job ad. It marks what they ask for, what your resume shows, what's
          missing, and what to fix before sending. Nothing leaves this browser.
        </p>
      </header>

      <main>
        <section className="inputs" aria-label="The two texts">
          <label className="sheet">
            <span className="sheet-title">Your resume</span>
            <textarea value={resume} onChange={(e) => setResume(e.target.value)} spellCheck={false}
              placeholder="Paste the text of your resume here, the whole thing, headings included." />
            <span className="sheet-foot">
              <span className="file">
                or <label className="link">pick the PDF<input type="file" accept="application/pdf,.pdf" hidden
                  onChange={(e) => { openPdf(e.target.files?.[0]); e.target.value = ''; }} /></label>
                {reading && <span role="status"> · {reading}</span>}
              </span>
              <span className="count">{words.resume ? `${words.resume} words` : ''}</span>
            </span>
          </label>
          <label className="sheet">
            <span className="sheet-title">The job ad</span>
            <textarea value={job} onChange={(e) => setJob(e.target.value)} spellCheck={false}
              placeholder="Paste the ad, with its 'Requirements' and 'Nice to have' parts if it has them." />
            <span className="count">{words.job ? `${words.job} words` : ''}</span>
          </label>
        </section>

        <div className="actions">
          <button type="button" className="go" disabled={!ready} onClick={compare}>Compare them</button>
          <button type="button" className="link" onClick={example}>or try it with an example</button>
        </div>

        {report && <ReportView report={report} />}
      </main>

      <footer>
        Made by <a href="https://github.com/ViniciuscLemos">Vinicius Lemos</a> ·{' '}
        <a href="https://github.com/ViniciuscLemos/shortlist">how it reads</a>
      </footer>
    </div>
  );
}

const GROUPS: [Weight, string, string][] = [
  ['required', 'What they require', 'From the "requirements" part of the ad.'],
  ['mentioned', 'What else they mention', 'In the description of the role, not as a requirement.'],
  ['nice', 'What would be a plus', 'Nice to have. Missing these rarely costs the interview.'],
];

const CHECK_NAME: Record<string, string> = {
  contact: 'Contact at the top',
  links: 'A link to your work',
  experience: 'Experience under its own heading',
  length: 'A length people read',
  numbers: 'Numbers in what you did',
  weak: 'No "responsible for"',
  verbs: 'Lines that start with an action',
  shown: 'Skills shown, not only listed',
};

const LEVEL: Record<string, string> = { intern: 'an internship', junior: 'a junior role', mid: 'a mid-level role', senior: 'a senior role', lead: 'a lead role' };

// long lines are cut around the skill, so the quote stays short
function quote(line: string, max = 110): string {
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

function SkillRow({ s }: { s: SkillResult }) {
  if (!s.evidence) {
    return (
      <li className="skill missing">
        <span className="name">{s.skill.name}</span>
        <span className="where">not in your resume · the ad says “{quote(s.line, 80)}”</span>
      </li>
    );
  }
  return (
    <li className={`skill ${s.onlyListed ? 'listed' : 'shown'}`}>
      <span className="name"><mark>{s.skill.name}</mark></span>
      <span className="where">
        {s.onlyListed ? 'only in a list, never shown being used' : <>“{quote(s.evidence.line)}”</>}
      </span>
    </li>
  );
}

function ReportView({ report }: { report: Report }) {
  const { years, level } = report;
  return (
    <section className="report" id="report" aria-label="The comparison">
      <div className="score-line">
        <p className="score"><span>{report.score}</span><small>/100</small></p>
        <p className="verdict">{report.verdict}</p>
      </div>

      {(years.asked || level) && (
        <p className="context">
          {level && <>It reads as {LEVEL[level]}. </>}
          {years.asked != null && <>They ask for {years.asked}+ years; the dates in your experience add up to {years.have ? `about ${years.have}` : 'less than one'}.</>}
          {years.asked == null && years.have > 0 && <>The dates in your experience add up to about {years.have} years.</>}
        </p>
      )}

      <div className="groups">
        {GROUPS.map(([weight, title, note]) => {
          const list = report.skills.filter((s) => s.weight === weight);
          if (!list.length) return null;
          const found = list.filter((s) => s.evidence).length;
          return (
            <section key={weight} className="group">
              <h2>{title} <span className="tally">{found} of {list.length}</span></h2>
              <p className="note">{note}</p>
              <ul>{list.map((s) => <SkillRow key={s.skill.id} s={s} />)}</ul>
            </section>
          );
        })}
      </div>

      <Checks report={report} />
    </section>
  );
}

function Checks({ report }: { report: Report }) {
  const todo = report.checks.filter((c) => !c.ok);
  const fine = report.checks.filter((c) => c.ok);
  return (
    <section className="checks">
      <h2>Before you send it</h2>
      {todo.length === 0 ? (
        <p className="note">Nothing to fix in the resume itself. What's left is the match above.</p>
      ) : (
        <ol>
          {todo.map((c) => (
            <li key={c.id}>
              <strong>{CHECK_NAME[c.id] ?? c.id}</strong>
              <span>{c.advice}</span>
            </li>
          ))}
        </ol>
      )}
      {fine.length > 0 && (
        <p className="fine">Already fine: {fine.map((c) => (CHECK_NAME[c.id] ?? c.id).toLowerCase()).join(', ')}.</p>
      )}
    </section>
  );
}
