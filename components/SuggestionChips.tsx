import React from 'react';
import { Info } from 'lucide-react';
import { Suggestion } from '../types';

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions, onSelect, disabled }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap pb-2 px-1 w-full items-end">
      {suggestions.map((suggestion, index) => {
        // 첫 번째 아이템인지 확인
        const isFirst = index === 0;

        return (
          <div key={index} className="relative group flex-shrink-0">
            {/* 
              Tooltip Styling 
              - isFirst가 true면 'left-0' (왼쪽 정렬)
              - 아니면 'left-1/2 -translate-x-1/2' (중앙 정렬)
            */}
            <div 
              className={`absolute bottom-full mb-3 w-64 p-3 bg-[#18181b] border border-zinc-700/50 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 backdrop-blur-md
                ${isFirst ? 'left-0' : 'left-1/2 -translate-x-1/2'}
              `}
            >
              {/* Arrow styling: Align with the tooltip box */}
              <div 
                className={`absolute -bottom-1.5 w-3 h-3 bg-[#18181b] border-r border-b border-zinc-700/50 transform rotate-45
                  ${isFirst ? 'left-6' : 'left-1/2 -translate-x-1/2'}
                `}
              ></div>
              
              <div className="flex gap-2">
                <div className={`mt-0.5 shrink-0 p-1 rounded-md h-fit bg-zinc-800`}>
                  <Info size={14} className="text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-200">
                    {suggestion.label}
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {suggestion.description || "이 옵션을 선택하여 대화를 계속합니다."}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelect(suggestion.label)}
              disabled={disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all duration-200 text-left bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/50`}
            >
              {suggestion.label}
            </button>
          </div>
        );
      })}
    </div>
  );
};