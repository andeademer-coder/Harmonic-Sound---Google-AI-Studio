import React, { useEffect, useRef } from 'react';
import { TrackItem, ResizeMode, CustomSound } from '../types';
import { NOTES, CHORDS } from '../constants';

interface WaveformVisualizerProps {
  item: TrackItem;
  customSounds: CustomSound[];
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ item, customSounds }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineJoin = 'round';
    if (item.reverb > 0) {
        ctx.shadowBlur = item.reverb * 15;
        ctx.shadowColor = 'rgba(14, 165, 233, 0.5)';
    }

    if (item.soundType === 'synth') {
      drawSynthWaveform(ctx, item);
    } else {
      const customSound = customSounds.find(s => s.id === item.customSoundId);
      if (customSound) {
        drawCustomWaveform(ctx, customSound.buffer, item);
      } else {
        drawMissingWaveform(ctx);
      }
    }

  }, [item, customSounds, canvasRef.current?.getBoundingClientRect().width]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
};

const drawMissingWaveform = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height/2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Missing Audio', width / 2, height / 2);
    ctx.restore();
};

const drawCustomWaveform = (ctx: CanvasRenderingContext2D, buffer: AudioBuffer, item: TrackItem) => {
    const { width, height } = ctx.canvas;
    const data = buffer.getChannelData(0); // Use the first channel
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.beginPath();
    ctx.moveTo(0, amp);
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
};

const drawSynthWaveform = (ctx: CanvasRenderingContext2D, item: TrackItem) => {
    if (item.soundType !== 'synth') return;
    
    const { width, height } = ctx.canvas;
    const { note, chord, waveform, daniMeleg, duration, originalDuration, resizeMode } = item;
    
    const rootFrequency = NOTES[note];
    const selectedChord = CHORDS.find(c => c.name === chord);
    if (!rootFrequency || !selectedChord) return;

    let playbackRate = 1;
    if (resizeMode === ResizeMode.Stretch && duration !== originalDuration && duration > 0) {
        playbackRate = originalDuration / duration;
    }
    
    const frequencies = selectedChord.intervals.map(interval => rootFrequency * Math.pow(2, interval / 12));

    let seed = 0;
    for (let i = 0; i < item.id.length; i++) seed += item.id.charCodeAt(i);
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const finalFrequencies = frequencies.map(freq => {
        let finalFreq = freq * playbackRate;
        if (daniMeleg > 0) {
            finalFreq *= Math.pow(2, ((random() - 0.5) * daniMeleg * 50) / 1200);
        }
        return finalFreq;
    });

    const amplitude = height * 0.4;
    const centerY = height / 2;
    const visualBaseFrequency = rootFrequency * playbackRate;
    const cyclesToShow = (visualBaseFrequency / 44) * duration;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < width; x++) {
        let compositeY = 0;
        finalFrequencies.forEach(freq => {
            const angle = (x / width) * cyclesToShow * (freq / visualBaseFrequency) * 2 * Math.PI;
            let waveValue = 0;
            switch (waveform) {
                case 'sine': waveValue = Math.sin(angle); break;
                case 'square': waveValue = Math.sin(angle) >= 0 ? 1 : -1; break;
                case 'sawtooth': waveValue = 2 * (angle / (2 * Math.PI) - Math.floor(0.5 + angle / (2 * Math.PI))); break;
                case 'triangle': waveValue = Math.abs(((angle / Math.PI) % 2) - 1) * 2 - 1; break;
            }
            compositeY += waveValue;
        });
        const normalizedY = (compositeY / frequencies.length);
        let finalY = centerY - normalizedY * amplitude;
        if (daniMeleg > 0) finalY += (random() - 0.5) * daniMeleg * height * 0.15;
        ctx.lineTo(x, finalY);
    }
    ctx.stroke();
}


export default WaveformVisualizer;