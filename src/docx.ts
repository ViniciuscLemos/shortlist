// Reads the text out of a Word resume (.docx), in the browser. A .docx is a zip with the
// text in word/document.xml, so this finds that one file in the zip, inflates it with the
// browser's own DecompressionStream and keeps the paragraphs. No library, nothing uploaded.

const decoder = new TextDecoder();

/** One file out of a zip, by name, or null when it isn't there. */
export async function unzipEntry(data: ArrayBuffer, name: string): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(data);
  const view = new DataView(data);
  // the end-of-central-directory record is in the last 64 KB (it can carry a comment)
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('not a zip');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('not a zip');
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const entry = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (entry === name) {
      // the local header has its own name and extra lengths before the data
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const raw = bytes.slice(start, start + size);
      if (method === 0) return raw;
      if (method !== 8) throw new Error('unknown compression');
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    at += 46 + nameLength + extra + comment;
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescape = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, code: string) => {
  if (code[0] === '#') return String.fromCodePoint(code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  return ENTITIES[code] ?? whole;
});

/** The text of word/document.xml: one line per paragraph, tabs and line breaks kept. */
export function documentText(xml: string): string {
  const lines: string[] = [];
  for (const match of xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g)) {
    const paragraph = match[0];
    let line = '';
    for (const piece of paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)) {
      if (piece[0].startsWith('<w:tab')) line += '\t';
      else if (piece[0].startsWith('<w:br') || piece[0].startsWith('<w:cr')) line += '\n';
      else line += unescape(piece[1] ?? '');
    }
    lines.push(line);
  }
  // runs of empty paragraphs (Word's way of adding space) become one blank line
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function docxText(file: File): Promise<string> {
  const xml = await unzipEntry(await file.arrayBuffer(), 'word/document.xml');
  if (!xml) throw new Error('not a docx');
  const text = documentText(decoder.decode(xml));
  if (!text) throw new Error('empty');
  return text;
}
