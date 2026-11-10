import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { analyze, type Report, type SkillResult } from './engine/match';
import type { Lang } from './engine/words';
import { reportText } from './engine/plaintext';
import { SAMPLE_JOB, SAMPLE_RESUME } from './engine/samples';
import { pdfText } from './pdf';
import { firstLang, UI, type Texts } from './ui';

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
  const [lang, setLang] = useState<Lang>(firstLang);
  const T = UI[lang];
  // the texts the report was made from, to tell when it no longer matches what's on the page
  const [compared, setCompared] = useState({ resume: '', job: '' });
  const stale = !!report && (compared.resume !== resume || compared.job !== job);

  const ready = resume.trim().length > 40 && job.trim().length > 40;

  // the page, the report and the browser tab all follow the language picked
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    remember('shortlist.lang', lang);
    setReport((r) => (r ? analyze(compared.resume, compared.job, new Date(), lang) : r));
  }, [lang]);

  function compare() {
    remember('shortlist.resume', resume);
    remember('shortlist.job', job);
    setReport(analyze(resume, job, new Date(), lang));
    setCompared({ resume, job });
    requestAnimationFrame(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }));
  }

  async function openPdf(file: File | undefined) {
    if (!file) return;
    setReading(T.reading(file.name));
    try {
      setResume(await pdfText(file));
      setReading('');
    } catch (e) {
      setReading(e instanceof Error && e.message.includes('scan') ? T.scanned : T.pdfFailed);
    }
  }

  function example() {
    setResume(SAMPLE_RESUME);
    setJob(SAMPLE_JOB);
    setReport(analyze(SAMPLE_RESUME, SAMPLE_JOB, new Date(), lang));
    setCompared({ resume: SAMPLE_RESUME, job: SAMPLE_JOB });
  }

  // ctrl+enter (cmd+enter on a Mac) from either sheet, so you don't have to reach for the button
  function shortcut(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ready) {
      e.preventDefault();
      compare();
    }
  }

  const words = useMemo(() => ({
    resume: resume.trim() ? resume.trim().split(/\s+/).length : 0,
    job: job.trim() ? job.trim().split(/\s+/).length : 0,
  }), [resume, job]);

  return (
    <div className="page">
      <header className="masthead">
        <div className="top-line">
          <p className="wordmark">shortlist</p>
          <div className="langs" role="group" aria-label="Language / Idioma">
            <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
            <button type="button" aria-pressed={lang === 'pt'} onClick={() => setLang('pt')}>Português</button>
          </div>
        </div>
        <h1>{T.title}</h1>
        <p className="lede">{T.lede}</p>
      </header>

      <main>
        <section className="inputs" aria-label={T.texts}>
          <label className="sheet">
            <span className="sheet-title">{T.resume}</span>
            <textarea value={resume} onChange={(e) => setResume(e.target.value)} onKeyDown={shortcut} spellCheck={false}
              placeholder={T.resumeHint} />
            <span className="sheet-foot">
              <span className="file">
                {T.or} <label className="link">{T.pickPdf}<input type="file" accept="application/pdf,.pdf" hidden
                  onChange={(e) => { openPdf(e.target.files?.[0]); e.target.value = ''; }} /></label>
                {reading && <span role="status"> · {reading}</span>}
              </span>
              <span className="count">{words.resume ? T.words(words.resume) : ''}</span>
            </span>
          </label>
          <label className="sheet">
            <span className="sheet-title">{T.job}</span>
            <textarea value={job} onChange={(e) => setJob(e.target.value)} onKeyDown={shortcut} spellCheck={false}
              placeholder={T.jobHint} />
            <span className="count">{words.job ? T.words(words.job) : ''}</span>
          </label>
        </section>

        <div className="actions">
          <button type="button" className="go" disabled={!ready} onClick={compare}>{T.compare}</button>
          <button type="button" className="link" onClick={example}>{T.example}</button>
          {ready && <span className="hint">{T.shortcut}</span>}
        </div>

        {stale && (
          <p className="stale" role="status">
            {T.stale} <button type="button" className="link" onClick={compare}>{T.again}</button>
          </p>
        )}
        {report && <ReportView report={report} T={T} />}
      </main>

      <footer>
        {T.madeBy} <a href="https://github.com/ViniciuscLemos">Vinicius Lemos</a> ·{' '}
        <a href="https://github.com/ViniciuscLemos/shortlist">{T.howItReads}</a>
      </footer>
    </div>
  );
}

// long lines are cut around the skill, so the quote stays short
function quote(line: string, max = 110): string {
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

function SkillRow({ s, T }: { s: SkillResult; T: Texts }) {
  if (!s.evidence) {
    return (
      <li className="skill missing">
        <span className="name">{s.skill.name}</span>
        <span className="where">
          {T.notInResume}
          {/* the line of the ad only helps when it says more than the name */}
          {s.line.trim().length > s.skill.name.length + 6 && <> · {T.adSays} “{quote(s.line, 80)}”</>}
        </span>
      </li>
    );
  }
  return (
    <li className={`skill ${s.onlyListed ? 'listed' : 'shown'}`}>
      <span className="name"><mark>{s.skill.name}</mark></span>
      <span className="where">
        {s.onlyListed ? T.onlyListed : <>“{quote(s.evidence.line)}”</>}
      </span>
    </li>
  );
}

function CopyText({ report, T }: { report: Report; T: Texts }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(reportText(report, T.checks, T.text));
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // no clipboard (old browser, or not allowed): nothing to do but not pretend it worked
    }
  }
  return <button type="button" className="link copy" onClick={copy}>{done ? T.copied : T.copy}</button>;
}

function ReportView({ report, T }: { report: Report; T: Texts }) {
  const { years, level } = report;
  return (
    <section className="report" id="report" aria-label={T.comparison}>
      <div className="score-line">
        <p className="score"><span>{report.score}</span><small>/100</small></p>
        <p className="verdict">{report.verdict}</p>
        <span className="report-tools">
          <CopyText report={report} T={T} />
          <button type="button" className="link copy" onClick={() => window.print()}>{T.print}</button>
        </span>
      </div>

      {(years.asked || level) && (
        <p className="context">
          {level && T.readsAs(T.level[level])}
          {years.asked != null && T.askYears(years.asked, years.have)}
          {years.asked == null && years.have > 0 && T.haveYears(years.have)}
        </p>
      )}

      <div className="groups">
        {T.groups.map(([weight, title, note]) => {
          const list = report.skills.filter((s) => s.weight === weight);
          if (!list.length) return null;
          const found = list.filter((s) => s.evidence).length;
          return (
            <section key={weight} className="group">
              <h2>{title} <span className="tally">{T.of(found, list.length)}</span></h2>
              <p className="note">{note}</p>
              <ul>{list.map((s) => <SkillRow key={s.skill.id} s={s} T={T} />)}</ul>
            </section>
          );
        })}
      </div>

      <Checks report={report} T={T} />
    </section>
  );
}

function Checks({ report, T }: { report: Report; T: Texts }) {
  const todo = report.checks.filter((c) => !c.ok);
  const fine = report.checks.filter((c) => c.ok);
  return (
    <section className="checks">
      <h2>{T.before}</h2>
      {todo.length === 0 ? (
        <p className="note">{T.nothingToFix}</p>
      ) : (
        <ol>
          {todo.map((c) => (
            <li key={c.id}>
              <strong>{T.checks[c.id] ?? c.id}</strong>
              <span>{c.advice}</span>
            </li>
          ))}
        </ol>
      )}
      {fine.length > 0 && (
        <p className="fine">{T.fine} {fine.map((c) => (T.checks[c.id] ?? c.id).toLowerCase()).join(', ')}.</p>
      )}
    </section>
  );
}
