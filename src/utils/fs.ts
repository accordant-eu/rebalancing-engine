import * as fs from 'fs';

/**
 * Asynchronously generates lines from a file reading backwards from the end.
 * Useful for reading recent logs without loading the entire file into memory.
 */
export async function* readLinesBackwards(filePath: string, chunkSize: number = 64 * 1024): AsyncGenerator<string> {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fd = await fs.promises.open(filePath, 'r');
  try {
    const stats = await fd.stat();
    let position = stats.size;
    let leftover = '';
    const buffer = Buffer.alloc(chunkSize);

    while (position > 0) {
      const readLength = Math.min(chunkSize, position);
      position -= readLength;
      
      const { bytesRead } = await fd.read(buffer, 0, readLength, position);
      const chunkStr = buffer.toString('utf-8', 0, bytesRead) + leftover;
      
      const lines = chunkStr.split('\n');
      leftover = lines.shift() || ''; // The first element is an incomplete line, keep it as leftover

      for (let i = lines.length - 1; i >= 0; i--) {
        yield lines[i];
      }
    }

    if (leftover) {
      yield leftover;
    }
  } finally {
    await fd.close();
  }
}
