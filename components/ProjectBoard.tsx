import React from 'react';
import { Scene } from '../types';
import { Image as ImageIcon, Wand2, RefreshCw } from 'lucide-react';

interface ProjectBoardProps {
  scenes: Scene[];
  onGenerateImage: (sceneId: string, prompt: string) => void;
  metaPrompt: string | null;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ scenes, onGenerateImage, metaPrompt }) => {
  
  return (
    <div className="h-full flex flex-col bg-[#050509] overflow-hidden border-l border-white/5">
      {/* Header aligned with Main Chat Header - matched h-16 and border */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#050509] shrink-0">
        <h2 className="text-zinc-400 text-sm font-medium tracking-tight">프로젝트 시각화</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col">
        
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
            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
              <span className="font-mono text-emerald-500 text-xs font-bold uppercase">장면 {scene.number}</span>
              <span className="text-xs text-zinc-500">{scene.duration}</span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-zinc-300 leading-relaxed break-keep">{scene.description}</p>
              
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
          <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-500/30 rounded-xl p-4 mt-6">
            <h3 className="text-emerald-400 font-bold mb-2 text-sm uppercase tracking-wide">최종 메타 프롬프트</h3>
            <div className="bg-black/50 p-3 rounded-lg border border-white/10 overflow-x-auto">
              <pre className="text-xs text-emerald-100 whitespace-pre-wrap font-mono">{metaPrompt}</pre>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(metaPrompt)}
              className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              클립보드에 복사
            </button>
          </div>
        )}

      </div>
    </div>
  );
};