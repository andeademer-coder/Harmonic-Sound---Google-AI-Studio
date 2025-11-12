import React from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';

interface PlayButtonProps {
  onClick: () => void;
  isPlaying: boolean;
  isDisabled?: boolean;
}

const PlayButton: React.FC<PlayButtonProps> = ({ onClick, isPlaying, isDisabled = false }) => {
  const disabled = isPlaying || isDisabled;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex items-center justify-center w-32 h-32 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4
        ${
          disabled
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-sky-500 text-white hover:bg-sky-400 focus:ring-sky-400 focus:ring-opacity-50'
        }
      `}
      aria-label={isPlaying ? "Stop sound" : "Play sound"}
    >
      <span className={`absolute h-full w-full rounded-full ${isPlaying ? 'bg-sky-400 animate-ping opacity-75' : ''}`}></span>
      <span className="relative z-10 text-4xl">
        {isPlaying ? <FaStop /> : <FaPlay />}
      </span>
    </button>
  );
};

export default PlayButton;