import React, { useState, useEffect, useRef } from 'react';
import { Send, Menu, X, Video, Settings, Lightbulb, Plane, Package, Utensils, Clapperboard, KeyRound, ArrowRight, Navigation } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { SuggestionChips } from './components/SuggestionChips';
import { ProjectBoard } from './components/ProjectBoard';
import { startChatSession, parseGeminiResponse, generateSceneImage } from './services/geminiService';
import { Message, Scene } from './types';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  // State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Project State
  const [scenes, setScenes] = useState<Scene[]>([]); 
  const [metaPrompt, setMetaPrompt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Starter Chips
  const starters = [
    { icon: <Plane size={14} className="text-blue-400" />, label: "여행 브이로그", prompt: "감성적인 일본 여행 브이로그를 기획하고 싶어." },
    { icon: <Package size={14} className="text-amber-400" />, label: "제품 리뷰", prompt: "새로운 테크 제품 언박싱 및 리뷰 영상 기획을 도와줘." },
    { icon: <Utensils size={14} className="text-pink-400" />, label: "요리/레시피", prompt: "자취생을 위한 간단 요리 레시피 영상 시리즈를 만들고 싶어." },
    { icon: <Clapperboard size={14} className="text-purple-400" />, label: "단편 영화", prompt: "3분 길이의 미스터리 단편 영화 시나리오를 쓰고 싶어." },
  ];

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check API Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (hasKey) {
          setHasApiKey(true);
          initializeChatInterface(false); 
        }
      } catch (e) {
        console.log("Environment check failed or local dev", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectKey = async () => {
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
      }
      setHasApiKey(true);
      initializeChatInterface(true); // True = show "Key Applied" system message
    } catch (e) {
      console.error("Key selection failed", e);
      // Fallback for demo
      setHasApiKey(true);
      initializeChatInterface(true);
    }
  };

  const initializeChatInterface = async (showSystemMsg: boolean) => {
    try {
      const session = await startChatSession();
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

      // 2. System Notification (Simulating the error style from screenshot for demo if showSystemMsg is true)
      if (showSystemMsg) {
        initialMessages.push({
          id: 'init-2',
          role: 'system',
          text: "기본 제공 API Key가 만료되었습니다.\n설정(⚙️) 메뉴에서 본인의 **Google GenAI API Key**를 등록하시면 즉시 이용 가능합니다.",
          timestamp: Date.now() + 100,
        });
      }

      setMessages(initialMessages);
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };

  // Handle Send Message
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
      const { cleanText, suggestions } = parseGeminiResponse(responseText);

      checkForScenes(cleanText);

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
    // Only set Meta Prompt if it's explicitly explicitly marked (logic to be improved, or removed for now to prevent early trigger)
    // We removed the loose "includes 'Meta-Prompt'" check to prevent the sidebar from filling up with conversation text.
    
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
    const imageUrl = await generateSceneImage(prompt);
    if (imageUrl) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageUrl, isGeneratingImage: false } : s));
    } else {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingImage: false } : s));
      alert("이미지를 생성할 수 없습니다.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // -------------------------------------------------------------------------
  // Render: API Key Landing Page
  // -------------------------------------------------------------------------
  if (!isCheckingKey && !hasApiKey) {
    return (
      <div className="flex h-screen w-full bg-[#050509] text-zinc-100 items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0b0c15] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
              <Video size={32} className="text-white" />
           </div>
           <h1 className="text-2xl font-bold mb-2">Din 비디오 어시스턴트</h1>
           <p className="text-zinc-400 mb-8 leading-relaxed">
             AI 기반 영상 기획 파트너 Din과 함께<br/>
             당신의 아이디어를 현실로 만들어보세요.
           </p>
           
           <button 
             onClick={handleConnectKey}
             className="group w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
           >
             <KeyRound size={18} />
             <span>API Key 연결하기</span>
             <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
           </button>
           
           <p className="mt-4 text-xs text-zinc-600">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
               Google AI Studio
             </a>에서 유료 API Key가 필요합니다.
           </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Main App
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-full bg-[#050509] text-zinc-100 font-sans overflow-hidden">
      
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
                <div className="px-3 py-1.5 rounded-md bg-[#11131f] border border-white/5">
                   <span className="text-xs text-blue-400 font-medium">비율: <span className="text-zinc-400 font-normal">16:9</span></span>
                </div>
             </div>

             <button className="p-2 ml-1 text-zinc-400 hover:text-white transition-colors">
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
        />
      </div>

    </div>
  );
};

export default App;