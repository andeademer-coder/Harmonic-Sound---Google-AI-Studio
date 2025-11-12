
// Fix: Import `ResizeMode` to resolve a type error and `TrackItem` for use in type definitions.
import { SynthTrackItem, CustomTrackItem, TrackItem, ResizeMode } from '../types';

// Fix: Define a specific type for playable synth items that includes dynamically calculated properties required for sound generation.
type PlayableSynthItem = SynthTrackItem & {
  rootFrequency: number;
  intervals: number[];
};

interface PlaySoundParams {
  // Fix: Update the 'item' type to reflect that it can be a `PlayableSynthItem` with extra properties, not just a base `TrackItem`.
  item: PlayableSynthItem | CustomTrackItem;
  customBuffer?: AudioBuffer;
  volume?: number;
}

let audioContext: AudioContext | null = null;
let activeSources: AudioNode[] = [];
let convolver: ConvolverNode | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    convolver = null; // Reset convolver with new context
  }
  return audioContext;
};

// Expose getAudioContext for the uploader to use
export { getAudioContext };

const createReverb = (context: AudioContext): ConvolverNode => {
    if (convolver && convolver.context === context) {
        return convolver;
    }

    const newConvolver = context.createConvolver();
    const sampleRate = context.sampleRate;
    const length = sampleRate * 2; // 2-second reverb tail
    const impulse = context.createBuffer(2, length, sampleRate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.5);
        impulseL[i] = (Math.random() * 2 - 1) * decay;
        impulseR[i] = (Math.random() * 2 - 1) * decay;
    }
    newConvolver.buffer = impulse;
    convolver = newConvolver;
    return newConvolver;
};


export const playSound = ({
  item,
  customBuffer,
  volume = 0.25,
}: PlaySoundParams): void => {
  const context = getAudioContext();
  if (!context) return;
  
  const now = context.currentTime;
  const { duration, reverb, resizeMode, originalDuration } = item;

  const masterGain = context.createGain();
  const attackTime = duration * 0.1;
  const releaseTime = duration * 0.4;

  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(volume, now + attackTime);
  masterGain.gain.setValueAtTime(volume, now + duration - releaseTime);
  masterGain.gain.linearRampToValueAtTime(0, now + duration);

  const extraNodes: AudioNode[] = [];
  let soundSourceNode: AudioScheduledSourceNode;

  if (reverb > 0) {
    const reverbNode = createReverb(context);
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    
    dryGain.gain.value = 1 - reverb * 0.5;
    wetGain.gain.value = reverb;
    
    masterGain.connect(dryGain);
    dryGain.connect(context.destination);
    
    masterGain.connect(wetGain);
    wetGain.connect(reverbNode);
    reverbNode.connect(context.destination);

    extraNodes.push(dryGain, wetGain);
  } else {
    masterGain.connect(context.destination);
  }

  let playbackRate = 1;
  if (resizeMode === ResizeMode.Stretch && duration !== originalDuration && duration > 0) {
    playbackRate = originalDuration / duration;
  }

  if (item.soundType === 'custom' && customBuffer) {
    const source = context.createBufferSource();
    source.buffer = customBuffer;
    source.playbackRate.value = playbackRate;
    soundSourceNode = source;

  } else if (item.soundType === 'synth') {
    // This is a dummy node because we create multiple oscillators for synth chords
    const synthGain = context.createGain();
    soundSourceNode = context.createBufferSource(); // Dummy, won't be started
    
    // Fix: With the updated `PlaySoundParams`, `item` is correctly typed as `PlayableSynthItem` here, so these properties are now accessible.
    const { rootFrequency, intervals, waveform, daniMeleg } = item;
    
    intervals.forEach(interval => {
      const frequency = rootFrequency * Math.pow(2, interval / 12);
      const oscillator = context.createOscillator();
      oscillator.type = waveform;

      let finalFrequency = frequency;
      if (daniMeleg > 0) {
        const randomFactor = (Math.random() - 0.5) * 2;
        const centsDeviation = randomFactor * daniMeleg * 50;
        finalFrequency = frequency * Math.pow(2, centsDeviation / 1200);
      }

      oscillator.frequency.setValueAtTime(finalFrequency * playbackRate, now);
      oscillator.connect(synthGain);
      oscillator.start(now);
      oscillator.stop(now + duration);
      activeSources.push(oscillator);
    });
    synthGain.connect(masterGain);
    activeSources.push(synthGain);
  } else {
    return; // Can't play sound
  }

  if (soundSourceNode instanceof AudioBufferSourceNode) {
     soundSourceNode.connect(masterGain);
  }
 
  soundSourceNode.start(now);
  soundSourceNode.stop(now + duration);
  
  const currentSources: AudioNode[] = [masterGain, soundSourceNode, ...extraNodes];
  activeSources.push(...currentSources);

  setTimeout(() => {
    activeSources = activeSources.filter(source => !currentSources.includes(source));
    currentSources.forEach(node => {
        try { node.disconnect(); } catch (e) {}
    });
  }, (duration + 0.1) * 1000);
};

export const stopAllSounds = (): void => {
  const sourcesToStop = [...activeSources];
  sourcesToStop.forEach(source => {
    if (source instanceof AudioScheduledSourceNode) {
      try { 
        source.stop(0); 
      } catch (e) { /* Ignore errors for already stopped nodes */ }
    }
    try { source.disconnect(); } catch (e) {}
  });
  activeSources = [];
};
