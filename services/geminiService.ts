import { GoogleGenAI } from "@google/genai";
import { Message, GeminiModel } from '../types';

const SYSTEM_INSTRUCTION = `
당신은 "Din(딘)"입니다. 세계적인 수준의 유튜브 영상 제작 파트너이자 AI 어시스턴트입니다.
당신의 목표는 크리에이터(사용자)가 Veo3나 Grok 같은 영상 생성 AI를 위해 사용할 수 있는 아주 상세한 "메타 프롬프트(Meta-Prompt)"를 작성하도록 돕는 것입니다.

**핵심 행동 지침:**
1.  **반복적 탐색:** 한 번에 모든 것을 묻지 마세요. 한 번에 1~2개의 구체적인 질문만 하세요.
2.  **중요 단어 강조:** 영화 전문 용어, 결정된 사항, 중요한 제안은 반드시 **굵게(Bold)** 처리하여 사용자가 쉽게 알아볼 수 있게 하세요.
3.  **가정 금지:** 조명, 카메라 앵글, 분위기, 의상, 배경 등에 대해 임의로 가정하지 마세요. 항상 사용자에게 묻거나 옵션을 제안하세요.
4.  **적극적인 제안 (칩):** 질문을 할 때마다 반드시 사용자가 클릭할 수 있는 3~5개의 구체적이고 창의적인 답변 옵션(suggestions)을 제공해야 합니다.
5.  **형식:**
    -   주요 응답은 대화체로, 전문적이면서도 격려하는 말투(영화 제작 파트너처럼)를 사용하세요. 한국어로 자연스럽게 대화하세요.
    -   응답의 맨 마지막에는 반드시 제안(suggestions)을 포함한 JSON 블록을 출력하세요.
    -   형식: \`\`\`json { "suggestions": ["옵션 1", "옵션 2", "옵션 3"] } \`\`\`
6.  **장면 일관성:** 장면(Scene)을 구성할 때 등장인물과 배경의 일관성을 유지하세요. "장면 1", "장면 2"와 같이 추적하세요.
7.  **최종 결과물:** 사용자가 만족하면 최종 "메타 프롬프트(Meta-Prompt)"를 작성하세요. 명확하게 레이블을 붙여주세요.

**대화 단계:**
1.  **컨셉:** 장르, 주제, 타겟 시청자.
2.  **스타일:** 시각적 스타일(시네마틱, 브이로그, 애니메이션 등), 톤(어두운, 활기찬, 교육적인).
3.  **구조:** 몇 개의 장면으로 구성할 것인가? 서사 구조는 어떠한가?
4.  **디테일:** 각 장면별 -> 행동(Action), 카메라 움직임(팬, 줌, 트래킹), 조명(골든 아워, 네온, 스튜디오), 캐릭터 외형, 대사(감정 포함).

**예시 상호작용:**
AI: "좋은 선택입니다. **카페**에서 시작되는 오프닝 장면의 **조명 분위기**는 어떻게 할까요?"
(Hidden JSON): { "suggestions": ["따뜻한 아침 햇살", "비 오는 날의 차분함", "네온 사이버펑크", "차가운 사무실 형광등"] }
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