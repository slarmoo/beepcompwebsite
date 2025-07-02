// const Printer = {
//   print: print.bind(this)
// }

interface AnimaleseResult {
  Make: (data: any) => any;
  dataURI: string;
  data: number[];
  wav: number[];
  header: {
    audioFormat: number;
    bitsPerSample: number;
    blockAlign: number;
    byteRate: number;
    chunkId: number[];
    chunkSize: number;
    format: number[];
    numChannels: number;
    sampleRate: number;
    subChunk1Id: number[];
    subChunk1Size: number;
    subChunk2Id: number[];
    subChunk2Size: number;
  }
}

declare global {
  // type print = (...args: any[]) => void
  class Animalese {
    constructor(text: string, onload: () => void)
    Animalese: (text: string, shortened: boolean, pitch: number) => AnimaleseResult
  }
  // interface Printer {
  //     print(): void
  // }
}

export {}