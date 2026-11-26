import type { Lang } from './engine/words';

// A picture of the score to post: only the number and the name of the site. Nothing from
// the resume or the ad goes in it, not even the title of the job.

const W = 1200;
const H = 630;
const PAPER = '#fbfaf5';
const INK = '#1c1b18';
const SOFT = '#57534a';
const MARKER = '#f6dd5a';

const WORDS = {
  en: { line: 'my resume matched', tail: 'of this job ad', foot: 'Compare yours. Nothing leaves the browser.' },
  pt: { line: 'meu currículo bateu', tail: 'com essa vaga', foot: 'Compare o seu. Nada sai do navegador.' },
};

export async function scoreCard(score: number, lang: Lang): Promise<Blob> {
  const w = WORDS[lang];
  // the page's fonts may still be on their way; without them the canvas falls back to Georgia
  await Promise.all([
    document.fonts.load('600 220px Literata'),
    document.fonts.load('400 44px Literata'),
    document.fonts.load('500 26px "JetBrains Mono"'),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.fillStyle = PAPER;
  c.fillRect(0, 0, W, H);

  // the wordmark, as on the page: a stroke of highlighter and the name
  c.fillStyle = MARKER;
  c.fillRect(80, 78, 30, 16);
  c.fillStyle = INK;
  c.font = '500 26px "JetBrains Mono", Consolas, monospace';
  c.textBaseline = 'middle';
  c.fillText('shortlist', 124, 87);

  c.textBaseline = 'alphabetic';
  c.fillStyle = SOFT;
  c.font = '400 44px Literata, Georgia, serif';
  c.fillText(w.line, 80, 220);

  // the number, with the highlighter behind it
  c.font = '600 220px Literata, Georgia, serif';
  const number = `${score}%`;
  const width = c.measureText(number).width;
  c.fillStyle = MARKER;
  c.fillRect(70, 300, width + 24, 120);
  c.fillStyle = INK;
  c.fillText(number, 80, 420);

  c.fillStyle = SOFT;
  c.font = '400 44px Literata, Georgia, serif';
  c.fillText(w.tail, 80, 490);

  c.fillStyle = INK;
  c.fillRect(80, 540, W - 160, 2);
  c.font = '500 22px "JetBrains Mono", Consolas, monospace';
  c.fillText('viniciusclemos.github.io/shortlist', 80, 582);
  c.fillStyle = SOFT;
  c.textAlign = 'right';
  c.font = '400 24px "Work Sans", system-ui, sans-serif';
  c.fillText(w.foot, W - 80, 582);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

/**
 * On a phone, the system share sheet (straight to LinkedIn, WhatsApp...). Elsewhere, or when
 * the phone can't share files, the picture is downloaded.
 */
export async function shareScore(score: number, lang: Lang): Promise<'shared' | 'saved'> {
  const blob = await scoreCard(score, lang);
  const file = new File([blob], `shortlist-${score}.png`, { type: 'image/png' });
  const phone = window.matchMedia('(pointer: coarse)').matches;
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      // closing the share sheet isn't an error worth a download
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
