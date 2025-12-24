import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Video, Settings, Plane, Package, Utensils, Clapperboard, Mic, KeyRound, ArrowRight, Navigation, ShieldCheck, ShieldAlert, Loader2, CheckCircle2, Megaphone, Sparkles } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { SuggestionChips } from './components/SuggestionChips';
import { ProjectBoard } from './components/ProjectBoard';
import { startChatSession, parseGeminiResponse, generateSceneImage, validateApiKey } from './services/geminiService';
import { Message, Scene, MetaPrompt } from './types';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  // --- API Key State ---
  const [showKeyModal, setShowKeyModal] = useState(true);
  const [activeApiKey, setActiveApiKey] = useState<string | undefined>(undefined);
  const [tempApiKey, setTempApiKey] = useState('');
  const [keyValidationStatus, setKeyValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [validationMsg, setValidationMsg] = useState('');

  // --- App State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // --- Project State ---
  const [scenes, setScenes] = useState<Scene[]>([]); 
  const [metaPrompt, setMetaPrompt] = useState<MetaPrompt | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Starter Chips - Updated order and added Animation/Ad as requested
  const starters = [
    { icon: <Clapperboard size={14} className="text-purple-400" />, label: "영화/드라마", prompt: "영화나 드라마 시나리오를 쓰고 싶어. 장르와 소재를 추천해줘." },
    { icon: <Sparkles size={14} className="text-yellow-400" />, label: "애니메이션", prompt: "애니메이션 영상을 기획하고 싶어. 비주얼 스타일과 스토리를 제안해줘." },
    { icon: <Mic size={14} className="text-emerald-400" />, label: "나레이션 영상", prompt: "나레이션이 중심이 되는 에세이 영상을 만들고 싶어. 주제를 추천해줘." },
    { icon: <Megaphone size={14} className="text-red-400" />, label: "광고 영상", prompt: "짧고 강렬한 광고 영상을 기획하고 싶어. 아이디어를 제안해줘." },
    { icon: <Utensils size={14} className="text-pink-400" />, label: "요리/레시피", prompt: "요리 레시피 영상을 기획하고 싶어. 스타일을 같이 정해보자." },
    { icon: <Plane size={14} className="text-blue-400" />, label: "브이로그", prompt: "일상이나 여행 브이로그를 기획하고 싶어. 어떤 컨셉이 좋을지 제안해줘." },
  ];

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- API Key Logic ---

  const handleValidateKey = async () => {
      if (!tempApiKey.trim()) return;
      setKeyValidationStatus('checking');
      setValidationMsg('Key 유효성을 확인 중입니다...');

      const result = await validateApiKey(tempApiKey);
      
      if (result.isValid) {
          setKeyValidationStatus('valid');
          setValidationMsg('정상적인 API Key입니다.');
      } else {
          setKeyValidationStatus('invalid');
          setValidationMsg(result.message);
      }
  };

  const handleUseCustomKey = () => {
      if (keyValidationStatus === 'valid') {
          setActiveApiKey(tempApiKey);
          setShowKeyModal(false);
          initializeChatInterface(tempApiKey, false);
      }
  };

  const handleUseDefaultKey = () => {
      // Use process.env.API_KEY (undefined passed to services implies default)
      setActiveApiKey(undefined);
      setShowKeyModal(false);
      initializeChatInterface(undefined, false);
  };

  const initializeChatInterface = async (apiKey: string | undefined, showSystemMsg: boolean) => {
    try {
      const session = await startChatSession(apiKey);
      setChatSession(session);

      const initialMessages: Message[] = [];

      // 1. Greeting
      const greetingText = `안녕하세요. 당신의 영상 제작 파트너 Din입니다.

아이디어를 멋진 영상 기획안으로 만들어 드리겠습니다.

어떤 영상을 만들고 싶으신가요?`;
      
      initialMessages.push({
        id: 'init-1',
        role: 'model',
        text: greetingText,
        timestamp: Date.now(),
      });

      setMessages(initialMessages);
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };

  // --- Chat Logic ---

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !chatSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now(),
    };

    // Add user message AND a temporary typing bubble for the model
    const typingMsgId = 'typing-' + Date.now();
    const typingMsg: Message = {
      id: typingMsgId,
      role: 'model',
      text: '',
      isTyping: true,
      timestamp: Date.now() + 1,
    };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const result = await chatSession.sendMessage({ message: text });
      const responseText = result.text || "죄송합니다. 처리 중에 문제가 발생했습니다.";
      const { cleanText, suggestions, finalPrompt } = parseGeminiResponse(responseText);

      checkForScenes(cleanText);

      // If we got a final prompt structure, update the state
      if (finalPrompt) {
          setMetaPrompt(finalPrompt);
          // If sidebar is hidden on mobile, show it to reveal the result
          if (window.innerWidth < 768) {
              setShowSidebar(true);
          }
      }

      // Replace the typing bubble with the actual response
      setMessages((prev) => prev.map(msg => 
        msg.id === typingMsgId 
          ? {
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: cleanText,
              suggestions: suggestions,
              timestamp: Date.now(),
              isTyping: false
            }
          : msg
      ));

    } catch (error) {
      console.error("Chat error:", error);
      // Replace typing bubble with error
      setMessages((prev) => prev.map(msg => 
        msg.id === typingMsgId 
          ? {
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: "연결 오류가 발생했습니다. 다시 시도해 주세요.",
              timestamp: Date.now(),
              isTyping: false
            }
          : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const checkForScenes = (text: string) => {
    const sceneRegex = /(?:Scene|장면)\s+(\d+)[:\s-](.*?)(?=\n(?:Scene|장면)|\n\n|$)/gis;
    let match;
    const newScenes: Scene[] = [];
    
    while ((match = sceneRegex.exec(text)) !== null) {
      const sceneNum = parseInt(match[1]);
      const content = match[2].trim();
      
      if (!scenes.find(s => s.number === sceneNum && s.description === content)) {
        newScenes.push({
          id: `scene-${Date.now()}-${sceneNum}`,
          number: sceneNum,
          description: content,
          visualPrompt: content + ", cinematic lighting, highly detailed, 8k", 
          audioPrompt: "",
          duration: "5-10s",
        });
      }
    }

    if (newScenes.length > 0) {
      setScenes(prev => [...prev, ...newScenes]);
      if (window.innerWidth > 768) {
          setShowSidebar(true);
      }
    }
  };

  const handleGenerateImage = async (sceneId: string, prompt: string) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingImage: true } : s));
    // Pass the active API key (or undefined for default)
    const imageUrl = await generateSceneImage(prompt, activeApiKey);
    if (imageUrl) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageUrl, isGeneratingImage: false } : s));
    } else {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingImage: false } : s));
      alert("이미지를 생성할 수 없습니다.");
    }
  };

  const handleUpdateScene = (sceneId: string, newDescription: string) => {
      setScenes(prev => prev.map(s => 
          s.id === sceneId ? { ...s, description: newDescription } : s
      ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-full bg-[#050509] text-zinc-100 font-sans overflow-hidden">
      
      {/* --- API Key Modal --- */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0b0c15] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-zinc-800 p-2 rounded-lg">
                        <KeyRound className="text-indigo-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">API Key 설정</h2>
                        <p className="text-sm text-zinc-400">Din 사용을 위한 접근 권한을 설정합니다.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-2 ml-1">Google GenAI API Key 입력</label>
                        <div className="flex gap-2">
                            <input 
                                type="password" 
                                value={tempApiKey}
                                onChange={(e) => {
                                    setTempApiKey(e.target.value);
                                    setKeyValidationStatus('idle'); // Reset on type
                                    setValidationMsg('');
                                }}
                                placeholder="sk-..."
                                className="flex-1 bg-[#12121a] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            />
                            <button 
                                onClick={handleValidateKey}
                                disabled={!tempApiKey || keyValidationStatus === 'checking'}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {keyValidationStatus === 'checking' ? <Loader2 className="animate-spin" size={18}/> : "확인"}
                            </button>
                        </div>
                    </div>

                    {/* Status Feedback Section */}
                    <div className={`rounded-xl p-4 border transition-all duration-300 ${
                        keyValidationStatus === 'valid' ? 'bg-emerald-900/10 border-emerald-500/20' : 
                        keyValidationStatus === 'invalid' ? 'bg-red-900/10 border-red-500/20' : 
                        'bg-zinc-900/50 border-white/5'
                    }`}>
                        <div className="flex items-start gap-3">
                            {keyValidationStatus === 'valid' && <ShieldCheck className="text-emerald-500 mt-0.5" size={18} />}
                            {keyValidationStatus === 'invalid' && <ShieldAlert className="text-red-500 mt-0.5" size={18} />}
                            {keyValidationStatus === 'idle' && <Settings className="text-zinc-500 mt-0.5" size={18} />}
                            {keyValidationStatus === 'checking' && <Loader2 className="text-indigo-500 mt-0.5 animate-spin" size={18} />}
                            
                            <div className="flex-1">
                                <h3 className={`text-sm font-bold mb-1 ${
                                    keyValidationStatus === 'valid' ? 'text-emerald-400' : 
                                    keyValidationStatus === 'invalid' ? 'text-red-400' : 
                                    'text-zinc-400'
                                }`}>
                                    {keyValidationStatus === 'valid' ? '인증 성공' : 
                                     keyValidationStatus === 'invalid' ? '인증 실패' : 
                                     keyValidationStatus === 'checking' ? '검증 중...' :
                                     '연결 상태 확인 대기'}
                                </h3>
                                
                                <div className="space-y-1.5 mt-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-zinc-500">채팅 모델 (Gemini 2.5/3):</span>
                                        <span className={keyValidationStatus === 'valid' ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>
                                            {keyValidationStatus === 'valid' ? '사용 가능' : '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-zinc-500">이미지 생성 (Imagen):</span>
                                        <span className={keyValidationStatus === 'valid' ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>
                                            {keyValidationStatus === 'valid' ? '사용 가능' : '-'}
                                        </span>
                                    </div>
                                </div>
                                
                                {validationMsg && (
                                    <p className={`text-xs mt-3 pt-3 border-t ${
                                        keyValidationStatus === 'valid' ? 'border-emerald-500/20 text-emerald-300/80' : 
                                        keyValidationStatus === 'invalid' ? 'border-red-500/20 text-red-300/80' : 
                                        'border-white/5 text-zinc-500'
                                    }`}>
                                        {validationMsg}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={handleUseDefaultKey}
                            className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-all"
                        >
                            기본 설정 사용 (Build Env)
                        </button>
                        <button 
                            onClick={handleUseCustomKey}
                            disabled={keyValidationStatus !== 'valid'}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                            <span>시작하기</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 text-center">
                     <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-zinc-500 hover:text-zinc-300 underline transition-colors">
                        Google AI Studio에서 API Key 발급받기
                     </a>
                </div>
            </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#050509] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-purple-900/20">
              <Video size={20} className="text-white fill-current" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">Din <span className="text-zinc-500 font-normal">비디오 어시스턴트</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Status Pills */}
             <div className="hidden md:flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-md bg-[#11131f] border border-white/5">
                   <span className="text-xs text-blue-400 font-medium">장르: <span className="text-zinc-400 font-normal">미정</span></span>
                </div>
                {activeApiKey && (
                    <div className="px-3 py-1.5 rounded-md bg-[#11131f] border border-emerald-500/20 flex items-center gap-1.5">
                       <CheckCircle2 size={12} className="text-emerald-500" />
                       <span className="text-xs text-zinc-400 font-medium">Custom Key</span>
                    </div>
                )}
             </div>

             <button 
                 onClick={() => setShowKeyModal(true)}
                 className="p-2 ml-1 text-zinc-400 hover:text-white transition-colors"
                 title="API Key 재설정"
             >
                <Settings size={20} />
             </button>

             <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden p-2 text-zinc-400 hover:text-white"
             >
                {showSidebar ? <X size={24} /> : <Menu size={24} />}
             </button>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
           <div className="w-full">
            {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
           </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#050509] border-t border-white/5 p-4 pb-6">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            
            {/* Contextual Chips or Starter Chips */}
            <div className="flex gap-2 flex-wrap pb-1 w-full">
              {(messages.length > 2 && !messages[messages.length - 1].isTyping && messages[messages.length - 1].role === 'model') ? (
                 <SuggestionChips 
                   suggestions={messages[messages.length - 1].suggestions || []} 
                   onSelect={handleSendMessage}
                   disabled={isTyping}
                 />
              ) : (
                // Only show starters if we are in initial state or it's user turn and no active response
                (messages.length <= 2 || messages[messages.length-1].role !== 'model') && !isTyping &&
                 starters.map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(starter.prompt)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#12121a] hover:bg-[#1a1a24] 
                                 border border-white/10 hover:border-white/20 rounded-full 
                                 text-sm text-zinc-300 transition-all duration-200 whitespace-nowrap group"
                    >
                       {starter.icon}
                       <span className="group-hover:text-white">{starter.label}</span>
                    </button>
                 ))
              )}
            </div>

            {/* Input and Send Button Row */}
            <div className="flex items-stretch gap-2">
                <div className="flex-1 bg-[#0a0a10] rounded-xl border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="영상에 대한 아이디어를 입력하세요..."
                    className="w-full h-full bg-transparent text-zinc-200 placeholder-zinc-600 px-4 py-3 focus:outline-none text-[15px]"
                    disabled={isTyping}
                  />
                </div>
                
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="flex items-center gap-2 px-6 bg-[#4f46e5] hover:bg-[#4338ca] disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-indigo-900/20 whitespace-nowrap"
                >
                  <span className="text-[15px]">전송</span>
                  {isTyping ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Navigation size={16} className="rotate-90 fill-current" />}
                </button>
            </div>

          </div>
        </div>
      </div>

      {/* Sidebar (Project Board) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-80 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 
        ${showSidebar ? 'translate-x-0' : 'translate-x-full'} md:w-[400px] shadow-2xl md:shadow-none bg-[#050509] border-l border-white/5`}>
          <div className="absolute top-4 right-4 md:hidden z-50">
             <button onClick={() => setShowSidebar(false)} className="text-zinc-400"><X /></button>
          </div>
        <ProjectBoard 
          scenes={scenes} 
          onGenerateImage={handleGenerateImage} 
          metaPrompt={metaPrompt}
          onUpdateScene={handleUpdateScene}
        />
      </div>

    </div>
  );
};

export default App;