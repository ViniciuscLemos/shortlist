import { useMemo, useState } from 'react';
import { analyze, type Report } from './engine/match';
import { SAMPLE_JOB, SAMPLE_RESUME } from './engine/samples';

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

  const ready = resume.trim().length > 40 && job.trim().length > 40;

  function compare() {
    remember('shortlist.resume', resume);
    remember('shortlist.job', job);
    setReport(analyze(resume, job));
    requestAnimationFrame(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }));
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
            <span className="count">{words.resume ? `${words.resume} words` : ''}</span>
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

function ReportView({ report }: { report: Report }) {
  return (
    <section className="report" id="report" aria-label="The comparison">
      <div className="score-line">
        <p className="score"><span>{report.score}</span><small>/100</small></p>
        <p className="verdict">{report.verdict}</p>
      </div>
    </section>
  );
}
