import React, { useRef, useCallback } from 'react';
import { TrackItem, CustomSound } from '../types';
import { NUM_TRACKS, TIMELINE_DURATION, PIXELS_PER_SECOND, SUBDIVISIONS, DEFAULT_SOUND_DURATION } from '../constants';
import { FaMousePointer } from 'react-icons/fa';
import WaveformVisualizer from './WaveformVisualizer';


interface TrackEditorProps {
  track: TrackItem[];
  customSounds: CustomSound[];
  onPlaceItem: (trackIndex: number, startTime: number) => void;
  onMoveItem: (id: string, newTrackIndex: number, newStartTime: number) => void;
  onResizeItem: (id: string, newStartTime: number, newDuration: number) => void;
  onEditItem: (item: TrackItem) => void;
  playheadPosition: number;
  isPlaying: boolean;
}

const TrackEditor: React.FC<TrackEditorProps> = ({ 
  track,
  customSounds,
  onPlaceItem, 
  onMoveItem,
  onResizeItem,
  onEditItem,
  playheadPosition,
  isPlaying 
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragItemRef = useRef<{ 
    id: string; 
    element: HTMLDivElement; 
    initialMouseX: number;
    initialMouseY: number;
    hasMoved: boolean; 
  } | null>(null);
   const resizeRef = useRef<{
    id: string;
    edge: 'left' | 'right';
    initialMouseX: number;
    initialStartTime: number;
    initialDuration: number;
  } | null>(null);

  const timelineWidth = TIMELINE_DURATION * PIXELS_PER_SECOND;
  const trackHeight = 64; // in pixels

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[role="button"]') || isPlaying || !gridRef.current) {
        return;
    }

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.parentElement!.scrollLeft;
    const y = e.clientY - rect.top;

    const trackIndex = Math.floor(y / trackHeight);
    const time = x / PIXELS_PER_SECOND;
    const snapIncrement = 1 / SUBDIVISIONS;
    const startTime = Math.floor(time / snapIncrement) * snapIncrement;
    
    if (startTime + DEFAULT_SOUND_DURATION <= TIMELINE_DURATION) {
       onPlaceItem(trackIndex, startTime);
    }
  };
  
  const handleMoveMouseMove = useCallback((e: MouseEvent) => {
    if (!dragItemRef.current) return;
    
    if (!dragItemRef.current.hasMoved) {
      dragItemRef.current.hasMoved = true;
    }
    const { element, initialMouseX, initialMouseY } = dragItemRef.current;
    element.style.cursor = 'grabbing';
    element.style.zIndex = '1000';
    element.style.opacity = '0.7';
    const deltaX = e.clientX - initialMouseX;
    const deltaY = e.clientY - initialMouseY;
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }, []);
  
  const handleMoveMouseUp = useCallback((e: MouseEvent) => {
    window.removeEventListener('mousemove', handleMoveMouseMove);
    window.removeEventListener('mouseup', handleMoveMouseUp);
    if (!dragItemRef.current) return;
    const { id, element, hasMoved, initialMouseX, initialMouseY } = dragItemRef.current;
    element.style.cursor = 'grab';
    element.style.zIndex = 'auto';
    element.style.opacity = '1';
    element.style.transform = '';

    if (hasMoved && gridRef.current) {
        const item = track.find(i => i.id === id);
        if (!item) return;
        const deltaX = e.clientX - initialMouseX;
        const deltaY = e.clientY - initialMouseY;
        const originalX = item.startTime * PIXELS_PER_SECOND;
        const originalY = item.trackIndex * trackHeight;
        const newX = originalX + deltaX;
        const newY = originalY + deltaY;
        let newTrackIndex = Math.round(newY / trackHeight);
        newTrackIndex = Math.max(0, Math.min(NUM_TRACKS - 1, newTrackIndex));
        const time = newX / PIXELS_PER_SECOND;
        const snapIncrement = 1 / SUBDIVISIONS;
        let newStartTime = Math.round(time / snapIncrement) * snapIncrement;
        newStartTime = Math.max(0, newStartTime);
        if (newStartTime + item.duration > TIMELINE_DURATION) {
            newStartTime = TIMELINE_DURATION - item.duration;
        }
        onMoveItem(id, newTrackIndex, newStartTime);
    }
    dragItemRef.current = null;
  }, [onMoveItem, handleMoveMouseMove, track]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, item: TrackItem) => {
    if (isPlaying || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragItemRef.current = { id: item.id, element: e.currentTarget, initialMouseX: e.clientX, initialMouseY: e.clientY, hasMoved: false };
    window.addEventListener('mousemove', handleMoveMouseMove);
    window.addEventListener('mouseup', handleMoveMouseUp);
  };
  
  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current || !gridRef.current) return;
  }, []);

  const handleResizeMouseUp = useCallback((e: MouseEvent) => {
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
    document.body.style.cursor = 'default';

    if (!resizeRef.current || !gridRef.current) return;
    const { id, edge, initialMouseX, initialStartTime, initialDuration } = resizeRef.current;
    const deltaX = e.clientX - initialMouseX;
    const deltaTime = deltaX / PIXELS_PER_SECOND;
    const snapIncrement = 1 / SUBDIVISIONS;
    const snappedDeltaTime = Math.round(deltaTime / snapIncrement) * snapIncrement;

    let newStartTime = initialStartTime;
    let newDuration = initialDuration;

    if (edge === 'left') {
      newStartTime = Math.max(0, initialStartTime + snappedDeltaTime);
      const endTime = initialStartTime + initialDuration;
      newDuration = endTime - newStartTime;
    } else { // 'right'
      newDuration = initialDuration + snappedDeltaTime;
    }

    if (newStartTime + newDuration > TIMELINE_DURATION) {
      newDuration = TIMELINE_DURATION - newStartTime;
    }
    if (newDuration < snapIncrement) {
      newDuration = snapIncrement;
      if (edge === 'left') newStartTime = initialStartTime + initialDuration - newDuration;
    }

    onResizeItem(id, newStartTime, newDuration);
    resizeRef.current = null;
  }, [onResizeItem, handleResizeMouseMove]);
  
  const handleResizeMouseDown = (e: React.MouseEvent, id: string, edge: 'left' | 'right') => {
    if (isPlaying) return;
    e.stopPropagation();
    e.preventDefault();
    const item = track.find(i => i.id === id);
    if (!item) return;

    resizeRef.current = { id, edge, initialMouseX: e.clientX, initialStartTime: item.startTime, initialDuration: item.duration };
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };

  const getItemLabel = (item: TrackItem): string => {
    if (item.soundType === 'synth') {
      return `${item.note} ${item.chord}`;
    }
    const sound = customSounds.find(s => s.id === item.customSoundId);
    return sound ? sound.name : 'Unknown Sound';
  };

  return (
    <div className="w-full overflow-x-auto bg-slate-900/70 rounded-lg border border-slate-700 select-none">
      <div className="p-4" style={{ minWidth: timelineWidth + 40 }}>
        {/* Timeline Header */}
        <div style={{ width: timelineWidth, height: '2rem' }} className="relative">
          {Array.from({ length: TIMELINE_DURATION + 1 }).map((_, sec) => (
            <div key={sec} style={{ left: sec * PIXELS_PER_SECOND }} className="absolute top-0 h-full flex items-end">
              <span className="text-xs text-slate-500 -translate-x-1/2">{sec}s</span>
            </div>
          ))}
        </div>
        
        {/* Grid and Tracks */}
        <div className="relative" style={{ width: timelineWidth, height: NUM_TRACKS * trackHeight }}>
          <div 
            ref={gridRef}
            className="absolute inset-0 cursor-crosshair"
            onClick={handleGridClick}
            role="grid"
          >
            {/* Background Grid Lines */}
            {Array.from({ length: NUM_TRACKS }).map((_, i) => (
              <div key={`track-bg-${i}`} className="h-16 border-t border-slate-800" />
            ))}
            {Array.from({ length: TIMELINE_DURATION * SUBDIVISIONS }).map((_, i) => {
                const isBeat = i % SUBDIVISIONS === 0;
                return ( <div key={`line-${i}`} className={`absolute top-0 bottom-0 w-px ${isBeat ? 'bg-slate-600' : 'bg-slate-800'}`} style={{ left: (i / SUBDIVISIONS) * PIXELS_PER_SECOND }} /> );
            })}
            {track.length === 0 && !isPlaying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                  <FaMousePointer className="text-4xl mb-2" />
                  <p>Click on the grid to place your selected sound</p>
              </div>
            )}
          </div>
          
          {/* Chord Items Layer */}
          <div className="absolute inset-0 pointer-events-none">
            {track.map(item => (
              <div
                key={item.id}
                className="absolute rounded text-white transition-colors duration-200 bg-sky-500/50 pointer-events-auto group overflow-hidden"
                style={{
                  left: item.startTime * PIXELS_PER_SECOND,
                  top: item.trackIndex * trackHeight + 4,
                  width: item.duration * PIXELS_PER_SECOND - 4,
                  height: trackHeight - 8,
                  cursor: isPlaying ? 'default' : 'grab',
                }}
                onMouseDown={(e) => handleMouseDown(e, item)}
                onDoubleClick={() => onEditItem(item)}
                role="button"
                aria-label={`Edit ${getItemLabel(item)}`}
              >
                <WaveformVisualizer item={item} customSounds={customSounds} />
                {!isPlaying && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100" onMouseDown={(e) => handleResizeMouseDown(e, item.id, 'left')} />
                    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100" onMouseDown={(e) => handleResizeMouseDown(e, item.id, 'right')} />
                  </>
                )}
                <div className="absolute top-1 right-2 text-right pointer-events-none">
                  <span className="font-bold text-xs truncate block">{getItemLabel(item)}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none"
            style={{ left: playheadPosition * PIXELS_PER_SECOND, transition: isPlaying ? 'none' : 'left 0.1s ease-out' }}
          />
        </div>
      </div>
    </div>
  );
};

export default TrackEditor;