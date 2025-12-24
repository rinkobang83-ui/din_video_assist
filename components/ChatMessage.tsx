import React from 'react';
import { Message } from '../types';
import { CheckSquare, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System Message Style (API Key Notification / Errors)
  if (isSystem) {
    const isError = message.text.includes("오류") || message.text.includes("만료") || message.text.includes("API Key");
    
    return (
      <div className="flex w-full mb-6 justify-start animate-fade-in-up">
        <div className="flex max-w-[95%] md:max-w-3xl w-full">
          <div className={`px-5 py-4 rounded-xl border shadow-xl w-full ${isError ? 'bg-[#13151f] border-red-500/20' : 'bg-[#1f2937] border-zinc-700/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isError ? (
                 <AlertCircle size={18} className="text-red-500 fill-red-500/10" />
              ) : (
                 <CheckSquare size={16} className="text-emerald-500" />
              )}
              <span className={`font-bold text-sm tracking-tight ${isError ? 'text-blue-200' : 'text-blue-200'}`}>
                {isError ? '서비스 연결 오류 (API Key 만료)' : '시스템 알림'}
              </span>
            </div>
            <div className="text-zinc-300 text-xs pl-7 leading-relaxed whitespace-pre-wrap break-keep">
               <ReactMarkdown
                  components={{
                      strong: ({node, ...props}) => <span className="text-blue-300 font-semibold" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-400 underline hover:text-blue-300" target="_blank" {...props} />
                  }}
               >
                  {message.text}
               </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Chat Message Logic
  let content = message.text;
  
  // 1. Strip "Din:" prefix if present to handle layout manually
  // This ensures we can put "Din:" in a separate column for perfect alignment
  const dinRegex = /^(\*\*?Din:\*\*?|Din:)\s*/i;
  const hasDinPrefix = !isUser && dinRegex.test(content);
  if (hasDinPrefix) {
      content = content.replace(dinRegex, '');
  }

  // 2. Clean Markdown: Fix common model errors like spaces inside bold tags "** Text **" -> "**Text**"
  // This prevents literal asterisks from showing up in the UI
  content = content.replace(/\*\*\s+([^*]+)\s+\*\*/g, '**$1**');
  content = content.replace(/\*\*\s+([^*]+)\*\*/g, '**$1**');
  content = content.replace(/\*\*([^*]+)\s+\*\*/g, '**$1**');

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[95%] md:max-w-3xl w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        
        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 max-w-full`}>
          
          <div
            className={`px-5 py-3.5 rounded-2xl text-[14px] leading-6 shadow-sm backdrop-blur-sm 
              ${isUser 
                ? 'bg-[#5848E8] text-white rounded-br-sm' 
                : 'bg-[#17171c] border border-white/5 text-zinc-200 rounded-bl-sm' 
              }`}
          >
            {message.isTyping ? (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
              </div>
            ) : (
              <div className="flex items-start text-left gap-2">
                 {/* Label Column */}
                 {!isUser && (
                    <span className="font-bold text-indigo-400 shrink-0 select-none mt-[1px]">Din:</span>
                 )}
                 
                 {/* Content Column - Markdown */}
                 <div className="flex-1 min-w-0 markdown-content whitespace-pre-wrap break-keep">
                     <ReactMarkdown
                        components={{
                            strong: ({node, ...props}) => (
                                <strong className={`font-bold ${isUser ? 'text-white' : 'text-indigo-400'}`} {...props} />
                            ),
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, 
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        }}
                     >
                        {content}
                     </ReactMarkdown>
                 </div>
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <span className="text-[10px] text-zinc-600 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Inline Image Result if applicable */}
          {message.sceneImage && (
            <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800 shadow-xl max-w-xs group relative">
              <img src={message.sceneImage} alt="Generated Scene" className="w-full h-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};