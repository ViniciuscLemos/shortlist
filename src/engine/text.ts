// Text helpers. Resumes and job ads come in Portuguese and English, with accents or
// without, "Node.js" or "NodeJS" or "node", so everything is compared in one plain form.

/** Lower case, no accents, single spaces. Keeps + # . / because of C++, C#, Node.js, CI/CD. */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[“”«»"']/g, ' ')
    .replace(/[^\p{L}\p{N}+#./\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A regex for a term as a whole word, where "word" also allows the symbols in the term:
 * "java" must not match inside "javascript", "c" must not match every word with a c,
 * and "c++" has to keep its pluses.
 */
export function termPattern(term: string): RegExp {
  const t = escape(plain(term)).replace(/\\ /g, '[\\s\\-/]?').replace(/ /g, '[\\s\\-/]?');
  return new RegExp(`(?<![\\p{L}\\p{N}+#])${t}(?![\\p{L}\\p{N}+#]|\\.[\\p{L}])`, 'u');
}

/** The lines of a text, without the empty ones and without bullet marks. */
export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*([-*•·▪◦‣]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

export const words = (text: string) => plain(text).split(' ').filter(Boolean).length;
