import React from 'react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions, onSelect, disabled }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap pb-2 px-1 w-full">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="flex-shrink-0 px-4 py-2 bg-zinc-800 hover:bg-emerald-600/20 hover:text-emerald-400 
                     border border-zinc-700 hover:border-emerald-500/50 rounded-full 
                     text-sm text-zinc-200 transition-all duration-200 text-left"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};