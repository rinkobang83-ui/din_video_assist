import { GoogleGenAI } from "@google/genai";
import { Message, GeminiModel } from '../types';

const SYSTEM_INSTRUCTION = `
당신은 "Din(딘)"입니다. 세계적인 수준의 유튜브 영상 제작 파트너이자 AI 어시스턴트입니다.
당신의 목표는 크리에이터(사용자)가 Veo3나 Grok 같은 영상 생성 AI를 위해 사용할 수 있는 아주 상세한 "메타 프롬프트(Meta-Prompt)"를 작성하도록 돕는 것입니다.

**핵심 행동 지침:**
1.  **단일 질문 원칙 (가장 중요):** 한 번에 오직 **한 가지** 주제만 물어보세요. 장르, 시간, 분위기를 한꺼번에 묻지 마세요. 하나씩 순서대로 결정해 나가세요.
2.  **중요 단어 강조:** 영화 전문 용어, 결정된 사항, 중요한 제안은 반드시 **굵게(Bold)** 처리하여 사용자가 쉽게 알아볼 수 있게 하세요.
3.  **가정 금지:** 조명, 카메라 앵글, 분위기, 의상, 배경 등에 대해 임의로 가정하지 마세요. 항상 사용자에게 묻거나 옵션을 제안하세요.
4.  **제안(Chips)의 원자성:** 칩(suggestions)에는 **오직 한 가지 정보**만 담아야 합니다. 여러 조건을 결합하지 마세요.
    - **절대 금지:** "출생의 비밀 (3분)", "밝은 분위기의 브이로그" (괄호나 수식어 결합 금지)
    - **올바른 예:** "출생의 비밀", "복수극", "3분", "5분", "밝은 분위기"
    - 사용자가 선택하기 가장 쉬운 단답형 키워드 3~5개를 제공하세요.
5.  **형식:**
    -   주요 응답은 대화체로, 전문적이면서도 격려하는 말투(영화 제작 파트너처럼)를 사용하세요. 한국어로 자연스럽게 대화하세요.
    -   응답의 맨 마지막에는 반드시 제안(suggestions)을 포함한 JSON 블록을 출력하세요.
    -   형식: \`\`\`json { "suggestions": ["옵션 1", "옵션 2", "옵션 3"] } \`\`\`
6.  **장면 일관성:** 장면(Scene)을 구성할 때 등장인물과 배경의 일관성을 유지하세요. "장면 1", "장면 2"와 같이 추적하세요.
7.  **최종 결과물:** 사용자가 만족하면 최종 "메타 프롬프트(Meta-Prompt)"를 작성하세요. 명확하게 레이블을 붙여주세요.

**대화 단계:**
1.  **컨셉:** 장르와 주제 설정. (예: "장르부터 정해볼까요?")
2.  **구조:** 러닝타임과 구성. (예: "영상 길이는 어느 정도로 생각하시나요?")
3.  **스타일:** 시각적 스타일과 톤.
4.  **디테일:** 각 장면별 행동, 카메라, 조명.

**예시 상호작용:**
AI: "좋은 선택입니다. 미스터리 장르군요. **러닝타임**은 어느 정도로 계획하시나요?"
(Hidden JSON): { "suggestions": ["1분 숏폼", "3분 내외", "5분 단편", "10분 이상"] }
`;

export const startChatSession = (customKey?: string) => {
  // Use custom key if provided, otherwise fallback to env
  const apiKey = customKey || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  return ai.chats.create({
    model: GeminiModel.CHAT,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const parseGeminiResponse = (responseText: string): { cleanText: string; suggestions: string[] } => {
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = responseText.match(jsonBlockRegex);

  let suggestions: string[] = [];
  let cleanText = responseText;

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
      }
      cleanText = responseText.replace(jsonBlockRegex, '').trim();
    } catch (e) {
      console.error("Failed to parse suggestions JSON", e);
    }
  }

  return { cleanText, suggestions };
};

export const generateSceneImage = async (prompt: string, customKey?: string): Promise<string | null> => {
  try {
    const apiKey = customKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GeminiModel.IMAGE,
      contents: {
        parts: [{ text: prompt }]
      },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const validateApiKey = async (apiKey: string): Promise<{ isValid: boolean; message: string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Attempt a very cheap/fast generation to validate the key
        await ai.models.generateContent({
            model: GeminiModel.CHAT,
            contents: "Test",
        });
        return { isValid: true, message: "API Key Verified" };
    } catch (error: any) {
        console.error("API Key Validation Error:", error);
        let msg = "유효하지 않은 API Key입니다.";
        if (error.message?.includes("403") || error.toString().includes("403")) {
            msg = "권한이 없거나 만료된 Key입니다.";
        }
        return { isValid: false, message: msg };
    }
};