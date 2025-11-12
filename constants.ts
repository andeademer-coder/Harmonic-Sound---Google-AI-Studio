
import { Note, Chord, ChordType, WaveformType } from './types';

// Audio constants
export const NOTES: Record<Note, number> = {
  'C': 261.63,
  'C#': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'B': 493.88,
};

export const NOTE_NAMES = Object.keys(NOTES) as Note[];

export const CHORDS: Chord[] = [
  { name: ChordType.Major, intervals: [0, 4, 7] },
  { name: ChordType.Minor, intervals: [0, 3, 7] },
  { name: ChordType.Diminished, intervals: [0, 3, 6] },
  { name: ChordType.Major7th, intervals: [0, 4, 7, 11] },
  { name: ChordType.Minor7th, intervals: [0, 3, 7, 10] },
  { name: ChordType.Dominant7th, intervals: [0, 4, 7, 10] },
];

export const WAVEFORM_TYPES: WaveformType[] = ['sine', 'square', 'sawtooth', 'triangle'];

// Editor constants
export const NUM_TRACKS = 4;
export const TIMELINE_DURATION = 30; // seconds
export const PIXELS_PER_SECOND = 100;
export const SUBDIVISIONS = 4; // 4 subdivisions per second (1/4 notes)
export const DEFAULT_SOUND_DURATION = 2; // seconds
