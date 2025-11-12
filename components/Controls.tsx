import React, { useRef } from 'react';
import { Note, ChordType, WaveformType, CustomSound } from '../types';
import { NOTE_NAMES, CHORDS, WAVEFORM_TYPES } from '../constants';
import PlayButton from './PlayButton';
import { FaUpload, FaMicrophone, FaStop } from 'react-icons/fa';

interface ControlsProps {
  rootNote: Note;
  setRootNote: (note: Note) => void;
  chordType: ChordType;
  setChordType: (type: ChordType) => void;
  waveform: WaveformType;
  setWaveform: (waveform: WaveformType) => void;
  soundSource: 'synth' | 'custom';
  setSoundSource: (source: 'synth' | 'custom') => void;
  customSounds: CustomSound[];
  selectedCustomSoundId: string | null;
  setSelectedCustomSoundId: (id: string | null) => void;
  onFileUpload: (file: File) => void;
  onAudition: () => void;
  isDisabled: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
}

const Selector: React.FC<{
  label: string;
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  isDisabled: boolean;
}> = ({ label, value, onChange, options, isDisabled }) => (
  <div className="flex flex-col items-start w-full">
    <label htmlFor={label} className="mb-2 text-sm font-medium text-slate-400">{label}</label>
    <select
      id={label}
      value={value ?? ''}
      onChange={onChange}
      disabled={isDisabled}
      className="w-full bg-slate-800 border border-slate-700 text-white text-lg rounded-lg focus:ring-sky-500 focus:border-sky-500 p-3 appearance-none disabled:opacity-50 transition-colors"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const Controls: React.FC<ControlsProps> = (props) => {
  const { 
    rootNote, setRootNote, chordType, setChordType, waveform, setWaveform,
    soundSource, setSoundSource, customSounds, selectedCustomSoundId, setSelectedCustomSoundId,
    onFileUpload, onAudition, isDisabled, isRecording, onToggleRecording
  } = props;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const noteOptions = NOTE_NAMES.map(note => ({ value: note, label: note }));
  const chordOptions = CHORDS.map(chord => ({ value: chord.name, label: chord.name }));
  const waveformOptions = WAVEFORM_TYPES.map(w => ({ value: w, label: w.charAt(0).toUpperCase() + w.slice(1) }));
  const customSoundOptions = customSounds.map(s => ({ value: s.id, label: s.name }));

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
      <div className="w-full max-w-xs space-y-4 p-4 bg-slate-900/50 rounded-lg">
        <label className="block mb-2 text-base font-medium text-slate-300">Sound Source</label>
        <div className="flex items-center gap-2 p-1 rounded-full bg-slate-800 w-full">
          <button onClick={() => setSoundSource('synth')} disabled={isDisabled} className={`w-1/2 px-4 py-2 text-sm rounded-full transition-colors ${soundSource === 'synth' ? 'bg-sky-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-700'}`}>Synthesizer</button>
          <button onClick={() => setSoundSource('custom')} disabled={isDisabled} className={`w-1/2 px-4 py-2 text-sm rounded-full transition-colors ${soundSource === 'custom' ? 'bg-sky-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-700'}`}>Custom</button>
        </div>
      </div>
      
      <div className="flex-1 max-w-xs space-y-6">
        {soundSource === 'synth' ? (
          <>
            <Selector label="Root Note" value={rootNote} onChange={(e) => setRootNote(e.target.value as Note)} options={noteOptions} isDisabled={isDisabled} />
            <Selector label="Chord Type" value={chordType} onChange={(e) => setChordType(e.target.value as ChordType)} options={chordOptions} isDisabled={isDisabled} />
            <Selector label="Waveform" value={waveform} onChange={(e) => setWaveform(e.target.value as WaveformType)} options={waveformOptions} isDisabled={isDisabled} />
          </>
        ) : (
          <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,.ogg,.flac" className="hidden" />
            <div className="flex gap-2 w-full">
                <button onClick={() => fileInputRef.current?.click()} disabled={isDisabled || isRecording} className="w-1/2 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
                    <FaUpload /> Upload
                </button>
                <button
                    onClick={onToggleRecording}
                    disabled={isDisabled}
                    className={`w-1/2 flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 ${isRecording ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    {isRecording ? <FaStop /> : <FaMicrophone />} {isRecording ? 'Stop' : 'Record'}
                </button>
            </div>
            {customSounds.length > 0 && (
              <Selector label="Select Custom Sound" value={selectedCustomSoundId} onChange={(e) => setSelectedCustomSoundId(e.target.value)} options={customSoundOptions} isDisabled={isDisabled || isRecording} />
            )}
             <p className="text-xs text-slate-500 text-center">Max 5MB & 60 seconds. Uploaded sounds are available for the current session only.</p>
          </>
        )}
      </div>
      
      <div className="self-center">
        <PlayButton onClick={onAudition} isPlaying={false} isDisabled={isDisabled || isRecording || (soundSource === 'custom' && !selectedCustomSoundId)}/>
      </div>
    </div>
  );
};

export default Controls;