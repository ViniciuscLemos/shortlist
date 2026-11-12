import { describe, expect, it } from 'vitest';
import { documentText, unzipEntry } from './docx';

const enc = new TextEncoder();

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

// a tiny zip, the way Word writes one: local headers, the data, then the central directory
async function zip(files: Record<string, string>, compress = true): Promise<ArrayBuffer> {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const plain = enc.encode(text);
    const data = compress ? await deflate(plain) : plain;
    const nameBytes = enc.encode(name);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, compress ? 8 : 0, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, plain.length, true);
    local.setUint16(26, nameBytes.length, true);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(10, compress ? 8 : 0, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, plain.length, true);
    dir.setUint16(28, nameBytes.length, true);
    dir.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, data);
    central.push(new Uint8Array(dir.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const dirBytes = concat(central);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, dirBytes.length, true);
  end.setUint32(16, offset, true);
  return concat([...parts, dirBytes, new Uint8Array(end.buffer)]).buffer as ArrayBuffer;
}

const XML = `<?xml version="1.0"?><w:document><w:body>
<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr><w:r><w:t>Camila Duarte</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">React &amp; </w:t></w:r><w:r><w:t>TypeScript</w:t></w:r><w:r><w:tab/><w:t>2021 – 2024</w:t></w:r></w:p>
<w:p/><w:p></w:p><w:p/>
<w:p><w:r><w:t>Line one</w:t><w:br/><w:t>line &#233;two</w:t></w:r></w:p>
</w:body></w:document>`;

describe('reading a .docx', () => {
  it('keeps paragraphs, runs, tabs, breaks and entities', () => {
    expect(documentText(XML)).toBe('Camila Duarte\nReact & TypeScript\t2021 – 2024\n\nLine one\nline étwo');
  });

  it('finds word/document.xml in the zip, compressed or not', async () => {
    for (const compress of [true, false]) {
      const data = await zip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': XML }, compress);
      const bytes = await unzipEntry(data, 'word/document.xml');
      expect(documentText(new TextDecoder().decode(bytes!))).toContain('React & TypeScript');
      expect(await unzipEntry(data, 'word/missing.xml')).toBeNull();
    }
  });

  it('says so when the file is not a zip', async () => {
    await expect(unzipEntry(new TextEncoder().encode('just some text, not a zip at all').buffer as ArrayBuffer, 'x')).rejects.toThrow('not a zip');
  });
});
