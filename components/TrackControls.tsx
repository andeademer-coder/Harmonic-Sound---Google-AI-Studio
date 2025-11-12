import React, { useState, useRef } from 'react';
import { FaPlayCircle, FaStopCircle, FaTrash, FaUndo, FaRedo, FaSave, FaFolderOpen, FaMagic } from 'react-icons/fa';

interface TrackControlsProps {
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onGenerateSong: () => void;
  isPlaying: boolean;
  isTrackEmpty: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const ControlButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
    ariaLabel: string;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}> = ({ onClick, disabled, children, ariaLabel, className = 'bg-slate-600 hover:bg-slate-500', onMouseEnter, onMouseLeave }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center px-5 py-2.5 text-base font-semibold rounded-full transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 text-white ${className}`}
        aria-label={ariaLabel}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
    >
        {children}
    </button>
);


const TrackControls: React.FC<TrackControlsProps> = ({ 
    onPlay, 
    onStop, 
    onClear, 
    onUndo,
    onRedo,
    onSave,
    onLoad,
    onGenerateSong,
    isPlaying, 
    isTrackEmpty,
    canUndo,
    canRedo,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<number | null>(null);

  const handleMouseEnter = () => {
    tooltipTimer.current = window.setTimeout(() => {
        setShowTooltip(true);
    }, 5000);
  };

  const handleMouseLeave = () => {
    if (tooltipTimer.current) {
        clearTimeout(tooltipTimer.current);
    }
    setShowTooltip(false);
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-4 mt-6">
      <div className="flex items-center justify-center flex-wrap gap-4">
        <ControlButton
          onClick={onUndo}
          disabled={!canUndo || isPlaying}
          ariaLabel="Undo last action"
        >
          <FaUndo className="mr-2" />
          Undo
        </ControlButton>
        <ControlButton
          onClick={onRedo}
          disabled={!canRedo || isPlaying}
          ariaLabel="Redo last action"
        >
          <FaRedo className="mr-2" />
          Redo
        </ControlButton>
        <ControlButton
          onClick={onSave}
          disabled={isTrackEmpty || isPlaying}
          ariaLabel="Save composition"
        >
          <FaSave className="mr-2" />
          Save
        </ControlButton>
        <ControlButton
          onClick={onLoad}
          disabled={isPlaying}
          ariaLabel="Load composition"
        >
          <FaFolderOpen className="mr-2" />
          Load
        </ControlButton>
        
        <div className="relative">
            <ControlButton
                onClick={onGenerateSong}
                disabled={isPlaying}
                ariaLabel="Generate BigRoberto song"
                className="bg-purple-600 hover:bg-purple-500"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <FaMagic className="mr-2" />
                BigRoberto
            </ControlButton>
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900 text-white text-sm px-3 py-1.5 rounded-md shadow-lg border border-slate-700 z-10">
                Tátszik! Rosszfiú!
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900"></div>
                </div>
            )}
        </div>

        <ControlButton
          onClick={isPlaying ? onStop : onPlay}
          disabled={isTrackEmpty}
          ariaLabel={isPlaying ? "Stop track" : "Play track"}
          className="bg-sky-500 hover:bg-sky-400"
        >
          {isPlaying ? <FaStopCircle className="mr-2" /> : <FaPlayCircle className="mr-2" />}
          {isPlaying ? 'Stop' : 'Play Track'}
        </ControlButton>
        <ControlButton
          onClick={onClear}
          disabled={isTrackEmpty || isPlaying}
          ariaLabel="Clear track"
          className="bg-rose-600 hover:bg-rose-500"
        >
          <FaTrash className="mr-2" />
          Clear
        </ControlButton>
      </div>
    </div>
  );
};

export default TrackControls;