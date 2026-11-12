import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// automatic accessibility check (contrast, labels, names...) on the page as it is
async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

test('the example: score, skills, a line to start from, and the checks', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'or try it with an example' }).click();
  const report = page.getByRole('region', { name: 'The comparison' });
  await expect(report).toBeFocused();
  await expect(report.locator('.score span')).toHaveText(/^\d+$/);

  const missing = report.locator('.skill.missing').first();
  await missing.getByText('how to show it').click();
  await expect(missing.locator('.suggest-line')).toContainText('[');
  await expect(report.getByRole('heading', { name: 'Before you send it' })).toBeVisible();
});

test('Português changes the page and the report, not the score', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'or try it with an example' }).click();
  const score = await page.locator('.score span').innerText();
  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('currículo');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.locator('.score span')).toHaveText(score);
  await page.getByRole('button', { name: 'English' }).click();
});

test('a Word file is read into the resume', async ({ page }) => {
  await page.goto('./');
  // a minimal .docx: a stored (uncompressed) zip with word/document.xml
  const xml = '<w:document><w:body><w:p><w:r><w:t>Camila Duarte</w:t></w:r></w:p><w:p><w:r><w:t>React &amp; TypeScript</w:t></w:r></w:p></w:body></w:document>';
  await page.locator('input[type=file]').setInputFiles({ name: 'cv.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: storedZip('word/document.xml', xml) });
  await expect(page.locator('textarea').first()).toHaveValue('Camila Duarte\nReact & TypeScript');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`no accessibility problems in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('./');
    expect(await audit(page)).toEqual([]);
    await page.getByRole('button', { name: 'or try it with an example' }).click();
    await page.locator('.skill.missing').first().getByText('how to show it').click();
    expect(await audit(page)).toEqual([]);
  });
}

function storedZip(name: string, text: string): Buffer {
  const data = Buffer.from(text);
  const file = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(file.length, 26);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt32LE(data.length, 20);
  dir.writeUInt32LE(data.length, 24);
  dir.writeUInt16LE(file.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + file.length, 12);
  end.writeUInt32LE(30 + file.length + data.length, 16);
  return Buffer.concat([local, file, data, dir, file, end]);
}

test('two ads kept, ranked, and either one opens', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'or try it with an example' }).click();
  await page.getByRole('button', { name: 'keep this ad in the list' }).click();
  await expect(page.getByText('this ad is in the list')).toBeVisible();

  await page.locator('textarea').nth(1).fill('Backend developer (Java)\nRequirements:\n- Java\n- Spring Boot\n- Kafka\n- 5+ years of experience');
  await page.getByRole('button', { name: 'Compare them' }).click();
  await page.getByRole('button', { name: 'keep this ad in the list' }).click();

  const rows = page.locator('.ads-list li');
  await expect(rows).toHaveCount(2);
  // the example fits better, so it comes first; the Java one is open now and says what's missing
  await expect(rows.nth(1)).toContainText('Backend developer (Java)');
  await expect(rows.nth(1)).toContainText('open now');
  await expect(rows.nth(1)).toContainText('Kafka');
  await rows.first().getByRole('button', { name: 'compare with it' }).click();
  await expect(rows.first()).toContainText('open now');
  await expect(page.locator('textarea').nth(1)).not.toHaveValue(/Kafka/);

  await rows.nth(1).getByRole('button', { name: /remove/ }).click();
  await expect(rows).toHaveCount(1);
});
