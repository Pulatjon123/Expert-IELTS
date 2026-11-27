/** Minimal PCM WAV helpers. The browser uploads 16 kHz, mono, 16-bit PCM WAV (encoded client-side). */

export const SAMPLE_RATE = 16000;

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
  durationSec: number;
}

export function parseWav(buf: Buffer): WavInfo {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file");
  let off = 12;
  let fmt: { format: number; channels: number; sampleRate: number; bits: number } | null = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), sampleRate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    } else if (id === "data") {
      if (!fmt || fmt.format !== 1) throw new Error("WAV must be PCM");
      const dataLength = Math.min(size, buf.length - off - 8);
      const bytesPerSec = fmt.sampleRate * fmt.channels * (fmt.bits / 8);
      return { sampleRate: fmt.sampleRate, channels: fmt.channels, bitsPerSample: fmt.bits, dataOffset: off + 8, dataLength, durationSec: dataLength / bytesPerSec };
    }
    off += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

export function buildWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Split a 16-bit mono WAV into chunks of at most `maxSec` seconds (for services with per-request length limits). */
export function splitWav(buf: Buffer, maxSec: number): { wav: Buffer; offsetSec: number }[] {
  const info = parseWav(buf);
  const bytesPerSec = info.sampleRate * 2;
  const chunkBytes = Math.floor(maxSec * bytesPerSec) & ~1;
  const pcm = buf.subarray(info.dataOffset, info.dataOffset + info.dataLength);
  const out: { wav: Buffer; offsetSec: number }[] = [];
  for (let start = 0; start < pcm.length; start += chunkBytes) {
    out.push({ wav: buildWav(Buffer.from(pcm.subarray(start, start + chunkBytes)), info.sampleRate), offsetSec: start / bytesPerSec });
  }
  return out;
}
