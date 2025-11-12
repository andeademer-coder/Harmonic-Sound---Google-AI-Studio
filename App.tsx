
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note, ChordType, TrackItem, WaveformType, ResizeMode, CustomSound, SynthTrackItem, CustomTrackItem } from './types';
import { NOTES, CHORDS, DEFAULT_SOUND_DURATION, NOTE_NAMES } from './constants';
import { playSound, stopAllSounds, getAudioContext } from './services/audioService';
import Controls from './components/Controls';
import TrackEditor from './components/TrackEditor';
import TrackControls from './components/TrackControls';
import PropertyEditorModal from './components/PropertyEditorModal';
import { FaMusic } from 'react-icons/fa';

const App: React.FC = () => {
  // Synth state
  const [rootNote, setRootNote] = useState<Note>('C');
  const [chordType, setChordType] = useState<ChordType>(ChordType.Major);
  const [waveform, setWaveform] = useState<WaveformType>('sine');
  
  // Custom sound state
  const [soundSource, setSoundSource] = useState<'synth' | 'custom'>('synth');
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [selectedCustomSoundId, setSelectedCustomSoundId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // History and track state
  const [history, setHistory] = useState<TrackItem[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const track = history[historyIndex];

  // Playback state
  const [isTrackPlaying, setIsTrackPlaying] = useState<boolean>(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  
  // UI state
  const [editingItem, setEditingItem] = useState<TrackItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const playbackStartTime = useRef<number>(0);
  const alreadyPlayed = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);


  // Auto-load on startup
  useEffect(() => {
    const savedTrackJSON = localStorage.getItem('harmonicSoundscapeComposition');
    if (savedTrackJSON) {
        try {
            const loadedTrack = (JSON.parse(savedTrackJSON) as TrackItem[]).map(item => ({
                ...item,
                resizeMode: item.resizeMode || ResizeMode.Trim
            }));
            if (Array.isArray(loadedTrack)) {
                setHistory([loadedTrack]);
                setHistoryIndex(0);
                setNotification('Welcome back! Your last session was loaded.');
                if (loadedTrack.some(item => item.soundType === 'custom')) {
                    setTimeout(() => setNotification('Reminder: Re-upload any custom sounds used in this project.'), 3500);
                }
            }
        } catch (error) {
            console.error("Failed to auto-load composition:", error);
        }
    }
  }, []);

  // Notification timeout
  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  const stopTrack = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    stopAllSounds();
    setIsTrackPlaying(false);
    setPlayheadPosition(0);
    alreadyPlayed.current.clear();
  }, []);
  
  const handleAudition = useCallback(() => {
    stopTrack();
    
    if (soundSource === 'synth') {
      const rootFrequency = NOTES[rootNote];
      const selectedChord = CHORDS.find(c => c.name === chordType);
      if (rootFrequency && selectedChord) {
        // Fix: Add an explicit type to `synthItem` to prevent TypeScript from widening `soundType` to `string`. This ensures the object matches the type expected by `playSound`.
        const synthItem: SynthTrackItem & { rootFrequency: number; intervals: number[] } = {
          soundType: 'synth', id: 'audition', trackIndex: 0, startTime: 0, 
          note: rootNote, chord: chordType, waveform, daniMeleg: 0,
          duration: DEFAULT_SOUND_DURATION, originalDuration: DEFAULT_SOUND_DURATION, reverb: 0, resizeMode: ResizeMode.Trim,
          rootFrequency, intervals: selectedChord.intervals,
        };
        playSound({ item: synthItem });
      }
    } else {
      const customSound = customSounds.find(s => s.id === selectedCustomSoundId);
      if (customSound) {
        const customItem: CustomTrackItem = {
          soundType: 'custom', id: 'audition', customSoundId: customSound.id,
          trackIndex: 0, startTime: 0,
          duration: customSound.buffer.duration, originalDuration: customSound.buffer.duration,
          reverb: 0, resizeMode: ResizeMode.Trim,
        };
        playSound({ item: customItem, customBuffer: customSound.buffer });
      }
    }
  }, [stopTrack, soundSource, rootNote, chordType, waveform, customSounds, selectedCustomSoundId]);


  const updateTrack = useCallback((newTrack: TrackItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newTrack]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex]);

  const handlePlaceItem = (trackIndex: number, startTime: number) => {
    let newItem: TrackItem | null = null;
    if (soundSource === 'synth') {
       newItem = {
        soundType: 'synth',
        id: `${Date.now()}-synth`,
        note: rootNote,
        chord: chordType,
        trackIndex, startTime,
        duration: DEFAULT_SOUND_DURATION, originalDuration: DEFAULT_SOUND_DURATION,
        waveform: waveform,
        reverb: 0, daniMeleg: 0,
        resizeMode: ResizeMode.Trim,
      };
    } else {
      const customSound = customSounds.find(s => s.id === selectedCustomSoundId);
      if (customSound) {
        const duration = Math.min(customSound.buffer.duration, DEFAULT_SOUND_DURATION);
         newItem = {
          soundType: 'custom',
          id: `${Date.now()}-custom`,
          customSoundId: customSound.id,
          trackIndex, startTime,
          duration: duration,
          originalDuration: duration,
          reverb: 0,
          resizeMode: ResizeMode.Trim,
        };
      }
    }
    if (newItem) {
      updateTrack([...track, newItem]);
    }
  };

  const handleRemoveItem = (id: string) => {
    updateTrack(track.filter(item => item.id !== id));
    setEditingItem(null);
  };

  const handleClearTrack = () => {
    stopTrack();
    if (track.length > 0) {
      updateTrack([]);
    }
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      stopTrack();
      setHistoryIndex(prevIndex => prevIndex - 1);
    }
  }, [historyIndex, stopTrack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      stopTrack();
      setHistoryIndex(prevIndex => prevIndex + 1);
    }
  }, [history, historyIndex, stopTrack]);

  const handleSave = useCallback(() => {
    try {
        localStorage.setItem('harmonicSoundscapeComposition', JSON.stringify(track));
        setNotification('Composition saved successfully!');
    } catch (error) {
        setNotification('Error: Could not save composition.');
    }
  }, [track]);

  const handleLoad = useCallback(() => {
    stopTrack();
    const savedTrackJSON = localStorage.getItem('harmonicSoundscapeComposition');
    if (savedTrackJSON) {
        try {
            const loadedTrack = (JSON.parse(savedTrackJSON) as TrackItem[]);
            updateTrack(loadedTrack);
            setNotification('Composition loaded successfully!');
            if (loadedTrack.some(item => item.soundType === 'custom')) {
              setTimeout(() => setNotification('Reminder: Re-upload any custom sounds for this project.'), 3500);
            }
        } catch (error) {
            setNotification('Error: Could not load composition.');
        }
    } else {
        setNotification('No saved composition found.');
    }
  }, [stopTrack, updateTrack]);

  const playTrack = useCallback(() => {
    if (track.length === 0) return;
    
    stopAllSounds();
    setIsTrackPlaying(true);
    
    playbackStartTime.current = performance.now();
    alreadyPlayed.current.clear();

    const animationLoop = (now: number) => {
      const elapsedTime = (now - playbackStartTime.current) / 1000;
      const timelineDuration = 30;

      if (elapsedTime > timelineDuration + 10) { // Add buffer
        stopTrack();
        return;
      }
      
      setPlayheadPosition(elapsedTime);
      
      track.forEach(item => {
        if (!alreadyPlayed.current.has(item.id) && elapsedTime >= item.startTime) {
          if (item.soundType === 'synth') {
            const rootFrequency = NOTES[item.note];
            const selectedChord = CHORDS.find(c => c.name === item.chord);
            if (rootFrequency && selectedChord) {
              const synthItem = { ...item, rootFrequency, intervals: selectedChord.intervals };
              playSound({ item: synthItem });
            }
          } else { // 'custom'
            const customSound = customSounds.find(s => s.id === item.customSoundId);
            if (customSound) {
              playSound({ item, customBuffer: customSound.buffer });
            }
          }
          alreadyPlayed.current.add(item.id);
        }
      });
      
      animationFrameId.current = requestAnimationFrame(animationLoop);
    };

    animationFrameId.current = requestAnimationFrame(animationLoop);
  }, [track, stopTrack, customSounds]);

  const handleUpdateItem = (updatedItem: TrackItem) => {
    updateTrack(track.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingItem(null);
  };

  const handleMoveItem = (id: string, newTrackIndex: number, newStartTime: number) => {
    updateTrack(track.map(item => item.id === id ? { ...item, trackIndex: newTrackIndex, startTime: newStartTime } : item));
  };

  const handleResizeItem = (id: string, newStartTime: number, newDuration: number) => {
    updateTrack(track.map(item => (item.id === id ? { ...item, startTime: newStartTime, duration: newDuration } : item)));
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setNotification('Error: File size cannot exceed 5MB.');
      return;
    }
    const audioContext = getAudioContext();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      if (audioBuffer.duration > 60) {
        setNotification('Error: Audio duration cannot exceed 60 seconds.');
        return;
      }
      const newSound: CustomSound = {
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        buffer: audioBuffer,
      };
      setCustomSounds(prev => {
          const newSounds = [...prev, newSound];
          setSelectedCustomSoundId(newSound.id);
          return newSounds;
      });
      setNotification(`'${file.name}' uploaded successfully!`);
    } catch (e) {
      setNotification('Error: Invalid audio file format.');
      console.error('File upload error:', e);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setNotification('Recording finished!');
    }
    if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = getAudioContext();
        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const newSound: CustomSound = {
                id: `${Date.now()}-recording`,
                name: `Recording-${new Date().toLocaleTimeString()}`,
                buffer: audioBuffer,
            };
            setCustomSounds(prev => {
                const newSounds = [...prev, newSound];
                setSelectedCustomSoundId(newSound.id);
                return newSounds;
            });
            setSoundSource('custom');
        } catch (e) {
            setNotification('Error processing recorded audio.');
            console.error('Error decoding audio data:', e);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setNotification('Recording... Click stop or wait 60s.');
      
      recordingTimerRef.current = window.setTimeout(handleStopRecording, 60000);

    } catch (err) {
      console.error("Microphone access error:", err);
      setNotification("Error: Microphone access denied or not available.");
    }
  }, [isRecording, handleStopRecording]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [isRecording, handleStartRecording, handleStopRecording]);

  const handleGenerateBigRobertoSong = useCallback(() => {
    stopTrack();
    const keys: Note[] = ['C', 'F', 'G', 'A', 'D'];
    const rootNote = keys[Math.floor(Math.random() * keys.length)];
    const progressionIntervals = [0, 7, 9, 5];
    const progressionChordTypes = [ChordType.Major, ChordType.Major, ChordType.Minor, ChordType.Major];
    const rootIndex = NOTE_NAMES.indexOf(rootNote);
    const songTrack: TrackItem[] = [];

    for (let i = 0; i < 4; i++) {
      const noteIndex = (rootIndex + progressionIntervals[i]) % 12;
      const note = NOTE_NAMES[noteIndex];
      const newItem: SynthTrackItem = {
        soundType: 'synth', id: `${Date.now()}-br-${i}`, note, chord: progressionChordTypes[i],
        trackIndex: 1, startTime: i * 2, duration: 2, originalDuration: 2,
        waveform: 'sine', reverb: 0.2, daniMeleg: 0, resizeMode: ResizeMode.Trim,
      };
      songTrack.push(newItem);
    }
    updateTrack(songTrack);
    setNotification('BigRoberto created a little tune for you!');
  }, [stopTrack, updateTrack]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-700 border border-sky-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100]">
          <p>{notification}</p>
        </div>
      )}
      <div className="w-full max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col items-center space-y-2 text-center">
           <FaMusic className="text-5xl text-sky-400" />
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
            Harmonic Soundscape
          </h1>
          <p className="text-slate-400">
            Craft your own multi-layered compositions with synths and custom sounds.
          </p>
        </header>

        <main className="space-y-10">
          <section className="bg-slate-800/50 p-6 rounded-lg space-y-6">
            <h2 className="text-xl font-semibold text-center text-sky-300">1. Select Sound</h2>
            <div className="flex flex-col md:flex-row items-center justify-center md:items-start gap-8">
              <Controls
                rootNote={rootNote} setRootNote={setRootNote}
                chordType={chordType} setChordType={setChordType}
                waveform={waveform} setWaveform={setWaveform}
                soundSource={soundSource} setSoundSource={setSoundSource}
                customSounds={customSounds}
                selectedCustomSoundId={selectedCustomSoundId}
                setSelectedCustomSoundId={setSelectedCustomSoundId}
                onFileUpload={handleFileUpload}
                onAudition={handleAudition}
                isRecording={isRecording}
                onToggleRecording={handleToggleRecording}
                isDisabled={isTrackPlaying}
              />
            </div>
             <p className="text-center text-slate-400 text-sm mt-4">Use the controls above to select a sound, then click on the grid below to place it.</p>
          </section>

          <section className="bg-slate-800/50 p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-semibold text-center text-sky-300">2. Build Your Composition</h2>
            <TrackEditor 
              track={track} 
              customSounds={customSounds}
              onPlaceItem={handlePlaceItem}
              onMoveItem={handleMoveItem}
              onResizeItem={handleResizeItem}
              onEditItem={(item) => { stopTrack(); setEditingItem(item); }}
              playheadPosition={playheadPosition}
              isPlaying={isTrackPlaying}
            />
            <TrackControls 
              onPlay={playTrack} onStop={stopTrack} onClear={handleClearTrack}
              isPlaying={isTrackPlaying} isTrackEmpty={track.length === 0}
              onUndo={handleUndo} onRedo={handleRedo}
              canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
              onSave={handleSave} onLoad={handleLoad}
              onGenerateSong={handleGenerateBigRobertoSong}
            />
          </section>
        </main>
      </div>
      <footer className="w-full text-center p-4 mt-8 text-slate-500 text-sm">
        <p>Built by a world-class senior frontend React engineer.</p>
      </footer>

      {editingItem && (
        <PropertyEditorModal 
          item={editingItem}
          customSounds={customSounds}
          onSave={handleUpdateItem}
          onClose={() => setEditingItem(null)}
          onDelete={handleRemoveItem}
        />
      )}
    </div>
  );
};

export default App;
