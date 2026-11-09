import type { Report } from './match';

const TITLES = { required: 'Required', mentioned: 'Also mentioned', nice: 'A plus' } as const;

/**
 * The report as plain text, to paste into notes or send to someone who's helping
 * with the resume. Short on purpose: what's there, what's missing, what to fix.
 */
export function reportText(report: Report, names: Record<string, string>): string {
  const out = [`${report.score}/100. ${report.verdict}`, ''];
  for (const weight of ['required', 'mentioned', 'nice'] as const) {
    const list = report.skills.filter((s) => s.weight === weight);
    if (!list.length) continue;
    out.push(`${TITLES[weight]}:`);
    for (const s of list) {
      const mark = !s.evidence ? '✗' : s.onlyListed ? '~' : '✓';
      const note = !s.evidence ? 'missing' : s.onlyListed ? 'only in a list' : '';
      out.push(`  ${mark} ${s.skill.name}${note ? ` (${note})` : ''}`);
    }
    out.push('');
  }
  const todo = report.checks.filter((c) => !c.ok);
  if (todo.length) {
    out.push('To fix:');
    todo.forEach((c, i) => out.push(`  ${i + 1}. ${names[c.id] ?? c.id}. ${c.advice}`));
  }
  return out.join('\n').trimEnd() + '\n';
}
