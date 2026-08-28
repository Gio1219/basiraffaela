// @ts-ignore
import * as rubberbandWasm from 'rubberband-wasm';

export async function pitchShiftHighQuality(audioBuffer: AudioBuffer, semitones: number): Promise<AudioBuffer> {
  const mod = rubberbandWasm as any;
  const initFn = mod.default || mod;
  const instance = typeof initFn === 'function' ? await initFn() : initFn;

  const pitchScale = Math.pow(2, semitones / 12);
  
  const processedBuffer = instance.process(audioBuffer, {
    pitch: pitchScale,
    formant: 1.0,
  });

  return processedBuffer;
}