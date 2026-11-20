// main.ts — make.fun bounty news-image-20261120 runtime entry.
// Node 22, STANDARD LIBRARY ONLY, no network. Copies the pre-rendered
// entry.png to $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).
// Deterministic: identical input bytes -> identical output bytes on every run.
//
// Written to be module-system agnostic (works whether Node treats this .ts as
// ESM or CommonJS): no static import statements, no import.meta, no top-level
// await. Only erasable TypeScript syntax is used so Node's type stripping runs
// it directly.

(async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Locate the pre-rendered asset next to this program (or in the cwd).
  function findEntry(): string {
    const here = process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd();
    const candidates: string[] = [
      path.join(here, 'entry.png'),
      path.join(process.cwd(), 'entry.png'),
      path.resolve('entry.png'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
    throw new Error('entry.png not found next to main.ts or in the working directory');
  }

  const source = findEntry();
  const bytes: Buffer = fs.readFileSync(source);

  // PNG-signature guard: refuse to emit anything that is not a whole PNG.
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('source asset is not a valid PNG (bad signature)');
  }

  // Bounty constraints: <= 1 MiB and <= 1024x1024. Read width/height from IHDR
  // (bytes 16..23 of a PNG are the big-endian width and height).
  const MAX_BYTES = 1048576;
  if (bytes.length > MAX_BYTES) {
    throw new Error(`entry.png is ${bytes.length} bytes, exceeds the 1 MiB limit`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width > 1024 || height > 1024) {
    throw new Error(`entry.png is ${width}x${height}, exceeds the 1024x1024 limit`);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const outPath = path.join(outDir, 'entry.png');
  fs.mkdirSync(outDir, { recursive: true });

  // Atomic write: stage to a sibling temp file, then rename into place so a
  // reader never observes a partial image.
  const tmpPath = `${outPath}.tmp`;
  fs.writeFileSync(tmpPath, bytes);
  fs.renameSync(tmpPath, outPath);

  // Read-back integrity check: the emitted file must equal the source bytes.
  const written: Buffer = fs.readFileSync(outPath);
  if (!written.equals(bytes)) {
    throw new Error('output verification failed: written bytes differ from source');
  }

  console.log(`wrote ${outPath} (${written.length} bytes, ${width}x${height})`);
})().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});