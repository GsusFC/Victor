declare module 'canvas-record' {
  export interface RecorderOptions {
    name?: string;
    duration?: number;
    frameRate?: number;
    download?: boolean;
    extension?: 'mp4' | 'webm' | 'gif';
    target?: 'in-browser' | 'download';
    encoderOptions?: {
      codec?: string;
      videoBitsPerSecond?: number;
    };
  }

  export class Recorder {
    constructor(context: GPUCanvasContext | CanvasRenderingContext2D, options?: RecorderOptions);
    start(): Promise<void>;
    step(): Promise<void>;
    stop(): Promise<ArrayBuffer | Uint8Array | Blob[] | undefined>;
    dispose(): Promise<void>;
  }
}

declare module 'media-codecs' {
  export namespace AVC {
    interface CodecOptions {
      profile?: 'Baseline' | 'Main' | 'High';
      level?: string;
    }
    function getCodec(options?: CodecOptions): string;
  }
}
