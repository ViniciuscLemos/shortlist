// Reads the text out of a PDF resume, in the browser: the file is never uploaded anywhere.
// pdf.js is loaded only when someone picks a file, so the page itself stays small.

export async function pdfText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    let text = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      text += item.str;
      // pdf.js marks where a line ends; without it every resume is one long line
      text += item.hasEOL ? '\n' : item.str && !item.str.endsWith(' ') ? ' ' : '';
    }
    pages.push(text);
  }
  await doc.cleanup();
  const all = pages.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // a scanned resume is a picture: there's no text to read
  if (all.replace(/\s/g, '').length < 40) {
    throw new Error("This PDF has no text in it (it's probably a scan). Paste the text instead.");
  }
  return all;
}
