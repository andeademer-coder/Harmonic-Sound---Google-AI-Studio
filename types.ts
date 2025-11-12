export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export enum ChordType {
  Major = 'Major',
  Minor = 'Minor',
  Diminished = 'Diminished',
  Major7th = 'Major 7th',
  Minor7th = 'Minor 7th',
  Dominant7th = 'Dominant 7th',
}

export enum ResizeMode {
  Trim = 'Trim',
  Stretch = 'Stretch',
}

export interface Chord {
  name: ChordType;
  intervals: number[];
}

export interface CustomSound {
  id: string;
  name: string;
  buffer: AudioBuffer;
}

// Discriminated union for track items
interface BaseTrackItem {
  id: string;
  trackIndex: number;
  startTime: number; // in seconds
  duration: number; // in seconds
  originalDuration: number; // in seconds, for stretching
  reverb: number; // 0 to 1
  resizeMode: ResizeMode;
}

export interface SynthTrackItem extends BaseTrackItem {
  soundType: 'synth';
  note: Note;
  chord: ChordType;
  waveform: WaveformType;
  daniMeleg: number; // 0 to 1
}

export interface CustomTrackItem extends BaseTrackItem {
  soundType: 'custom';
  customSoundId: string;
}

export type TrackItem = SynthTrackItem | CustomTrackItem;