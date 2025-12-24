import React, { useState } from 'react';
import { Scene, MetaPrompt } from '../types';
import { Image as ImageIcon, Wand2, RefreshCw, Copy, Check, Pencil, Globe } from 'lucide-react';

interface ProjectBoardProps {
  scenes: Scene[];
  onGenerateImage: (sceneId: string, prompt: string) => void;
  metaPrompt: MetaPrompt | null;
  onUpdateScene: (sceneId: string, text: string) => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ scenes, onGenerateImage, metaPrompt, onUpdateScene }) => {
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [promptLang, setPromptLang] = useState<'ko' | 'en'>('ko');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);

  const handleCopyScene = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSceneId(id);
    setTimeout(() => setCopiedSceneId(null), 2000);
  };

  const handleCopyMetaPrompt = () => {
    if (metaPrompt) {
      navigator.clipboard.writeText(metaPrompt[promptLang]);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050509] overflow-hidden border-l border-white/5">
      {/* Header aligned with Main Chat Header - matched h-16 and border */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#050509] shrink-0">
        <h2 className="text-zinc-400 text-sm font-medium tracking-tight">프로젝트 시각화</h2>
        
        {/* Meta Prompt Language Toggle */}
        {metaPrompt && (
           <div className="flex bg-[#12121a] rounded-lg p-0.5 border border-white/10">
              <button 
                onClick={() => setPromptLang('en')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${promptLang === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setPromptLang('ko')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${promptLang === 'ko' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                한글
              </button>
           </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col scrollbar-thin scrollbar-thumb-zinc-800">
        
        {scenes.length === 0 && !metaPrompt && (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 opacity-60 pb-20">
             <div className="mb-6 p-5 bg-[#12121a] rounded-3xl border border-white/5">
                <ImageIcon size={48} strokeWidth={1} className="text-zinc-700" />
             </div>
             <p className="text-sm text-center font-medium mb-1 text-zinc-500">아직 생성된 이미지가 없습니다.</p>
             <p className="text-xs text-center text-zinc-600 max-w-[220px] leading-relaxed">
               시나리오를 논의하고 장면 미리보기를 생성해 보세요.
             </p>
          </div>
        )}

        {scenes.map((scene) => (
          <div key={scene.id} className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden group hover:border-white/10 transition-colors">
            {/* Header */}
            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center group/header">
              <span className="font-mono text-emerald-500 text-xs font-bold uppercase">장면 {scene.number}</span>
              <div className="flex items-center gap-2">
                 <span className="text-xs text-zinc-500">{scene.duration}</span>
                 
                 {/* Copy Button */}
                 <button 
                    onClick={() => handleCopyScene(scene.id, scene.description)}
                    className="opacity-0 group-hover/header:opacity-100 transition-opacity text-zinc-400 hover:text-white"
                    title="프롬프트 복사"
                 >
                    {copiedSceneId === scene.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                 </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 relative">
              {editingSceneId === scene.id ? (
                  <textarea 
                    value={scene.description}
                    onChange={(e) => onUpdateScene(scene.id, e.target.value)}
                    onBlur={() => setEditingSceneId(null)}
                    autoFocus
                    className="w-full bg-black/20 text-sm text-zinc-200 p-2 rounded border border-indigo-500/50 focus:outline-none resize-y min-h-[80px]"
                  />
              ) : (
                  <div className="group/text relative">
                    <p 
                        className="text-sm text-zinc-300 leading-relaxed break-keep cursor-text"
                        onClick={() => setEditingSceneId(scene.id)}
                    >
                        {scene.description}
                    </p>
                    <button 
                        onClick={() => setEditingSceneId(scene.id)}
                        className="absolute -right-2 -top-2 p-1.5 opacity-0 group-hover/text:opacity-100 transition-opacity bg-zinc-800 rounded-full shadow-lg border border-white/10"
                    >
                        <Pencil size={10} className="text-zinc-400" />
                    </button>
                  </div>
              )}
              
              {/* Image Preview Area */}
              <div className="mt-3 relative rounded-lg bg-black/40 aspect-video flex items-center justify-center border border-white/5 overflow-hidden">
                {scene.imageUrl ? (
                  <img src={scene.imageUrl} alt={`Scene ${scene.number}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                     {scene.isGeneratingImage ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-500">
                          <RefreshCw className="animate-spin" size={20} />
                          <span className="text-xs">생성 중...</span>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-700">
                           <ImageIcon size={24} />
                           <span className="text-xs">이미지 없음</span>
                        </div>
                     )}
                  </div>
                )}
                
                {/* Generate Button Overlay */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onGenerateImage(scene.id, scene.visualPrompt || scene.description)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg shadow-lg backdrop-blur-sm"
                        title="장면 이미지 생성"
                    >
                        <Wand2 size={16} />
                    </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {metaPrompt && (
          <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-500/30 rounded-xl p-4 mt-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
                 <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                    <Globe size={14} />
                    최종 메타 프롬프트
                 </h3>
                 <span className="text-[10px] text-zinc-500 uppercase px-2 py-0.5 rounded border border-white/5">
                    {promptLang === 'ko' ? 'Korean' : 'English'}
                 </span>
            </div>
            
            <div className="bg-black/50 p-3 rounded-lg border border-white/10 overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-zinc-700">
              <pre className="text-xs text-emerald-100 whitespace-pre-wrap font-mono leading-relaxed">
                  {metaPrompt[promptLang]}
              </pre>
            </div>
            
            <button 
              onClick={handleCopyMetaPrompt}
              className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copiedPrompt ? <Check size={16} /> : <Copy size={16} />}
              {copiedPrompt ? '복사 완료!' : '전체 프롬프트 복사'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};