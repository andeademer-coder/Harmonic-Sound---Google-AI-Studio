import React, { useState, useEffect } from 'react';
import { TrackItem, Note, ChordType, WaveformType, ResizeMode, CustomSound } from '../types';
import { NOTE_NAMES, CHORDS, WAVEFORM_TYPES } from '../constants';
import { FaTimes, FaTrash } from 'react-icons/fa';

interface PropertyEditorModalProps {
  item: TrackItem;
  customSounds: CustomSound[];
  onSave: (item: TrackItem) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const PropertyEditorModal: React.FC<PropertyEditorModalProps> = ({ item, customSounds, onSave, onClose, onDelete }) => {
  const [editedItem, setEditedItem] = useState<TrackItem>(item);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  useEffect(() => {
    setEditedItem({ ...item, resizeMode: item.resizeMode || ResizeMode.Trim });
  }, [item]);

  const handleSave = () => {
    onSave(editedItem);
  };

  const handleDelete = () => {
    onDelete(editedItem.id);
  };

  const handleSliderMouseMove = (e: MouseEvent) => {
    setTooltip(prev => ({ ...prev, visible: true, x: e.clientX + 15, y: e.clientY }));
  };

  const handleSliderMouseUp = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
    window.removeEventListener('mousemove', handleSliderMouseMove);
    window.removeEventListener('mouseup', handleSliderMouseUp);
  };

  const handleSliderMouseDown = (text: string) => {
    setTooltip(prev => ({ ...prev, text }));
    window.addEventListener('mousemove', handleSliderMouseMove);
    window.addEventListener('mouseup', handleSliderMouseUp);
  };
  
  const customSoundName = item.soundType === 'custom' 
    ? customSounds.find(s => s.id === item.customSoundId)?.name
    : null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-700 m-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-sky-300">Edit Sound Properties</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <FaTimes size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {editedItem.soundType === 'synth' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-slate-400">Root Note</label>
                    <select value={editedItem.note} onChange={e => setEditedItem({...editedItem, note: e.target.value as Note})} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5">
                      {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-slate-400">Chord Type</label>
                    <select value={editedItem.chord} onChange={e => setEditedItem({...editedItem, chord: e.target.value as ChordType})} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5">
                      {CHORDS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-400">Waveform</label>
                  <select value={editedItem.waveform} onChange={e => setEditedItem({...editedItem, waveform: e.target.value as WaveformType})} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5">
                    {WAVEFORM_TYPES.map(w => <option key={w} value={w} className="capitalize">{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-400">Dani meleg ({Math.round((editedItem.daniMeleg || 0) * 100)}%)</label>
                  <input type="range" min="0" max="1" step="0.05" value={editedItem.daniMeleg || 0} onMouseDown={() => handleSliderMouseDown("ingum-bingum")} onChange={e => setEditedItem({...editedItem, daniMeleg: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              </>
            ) : (
                <div>
                    <label className="block mb-2 text-sm font-medium text-slate-400">Custom Sound</label>
                    <p className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5 truncate">{customSoundName || 'Unknown File'}</p>
                </div>
            )}
            
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-400">Reverb ({Math.round(editedItem.reverb * 100)}%)</label>
              <input type="range" min="0" max="1" step="0.05" value={editedItem.reverb} onChange={e => setEditedItem({...editedItem, reverb: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-400">Resize Mode</label>
              <div className="flex items-center gap-2 p-1 rounded-full bg-slate-700 w-min">
                <button onClick={() => setEditedItem({...editedItem, resizeMode: ResizeMode.Trim})} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${editedItem.resizeMode === ResizeMode.Trim ? 'bg-sky-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-600'}`}>Trim</button>
                <button onClick={() => setEditedItem({...editedItem, resizeMode: ResizeMode.Stretch})} className={`px-4 py-1.5 text-sm rounded-full transition-colors ${editedItem.resizeMode === ResizeMode.Stretch ? 'bg-sky-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-600'}`}>Stretch</button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <button onClick={handleDelete} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-semibold px-4 py-2 rounded-lg transition-colors">
              <FaTrash /> Delete
            </button>
            <button onClick={handleSave} className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-2 px-6 rounded-full transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
      {tooltip.visible && (
        <div className="fixed top-0 left-0 bg-black/80 text-white text-sm px-2 py-1 rounded pointer-events-none z-[100]" style={{ transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}>
          {tooltip.text}
        </div>
      )}
    </>
  );
};

export default PropertyEditorModal;