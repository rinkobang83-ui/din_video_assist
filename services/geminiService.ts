import { GoogleGenAI } from "@google/genai";
import { Message, GeminiModel, MetaPrompt, Suggestion } from '../types';

const SYSTEM_INSTRUCTION = `
당신은 "Din(딘)"입니다. 세계적인 수준의 유튜브 영상 제작 파트너이자 AI 어시스턴트입니다.
당신의 목표는 크리에이터(사용자)가 Veo3나 Grok 같은 영상 생성 AI를 위해 사용할 수 있는 아주 상세한 "메타 프롬프트(Meta-Prompt)"를 작성하도록 돕는 것입니다.

**핵심 행동 지침:**
1.  **단일 질문 원칙 (가장 중요):** 한 번에 오직 **한 가지** 주제만 물어보세요. 장르, 시간, 분위기를 한꺼번에 묻지 마세요. 하나씩 순서대로 결정해 나가세요.
2.  **중요 단어 강조:** 영화 전문 용어, 결정된 사항, 중요한 제안은 반드시 **굵게(Bold)** 처리하여 사용자가 쉽게 알아볼 수 있게 하세요.
3.  **가정 금지:** 조명, 카메라 앵글, 분위기, 의상, 배경 등에 대해 임의로 가정하지 마세요. 항상 사용자에게 묻거나 옵션을 제안하세요.
4.  **제안(Chips)의 형식:** 칩(suggestions)은 단순 문자열이 아닌 **객체 배열**이어야 합니다.
    - 각 칩은 \`label\`(표시명)과 \`description\`(설명)을 가져야 합니다.
    - \`label\`: 3~5단어 이내의 간결한 키워드 (예: "사이버펑크", "3분 숏폼")
    - \`description\`: 이 옵션을 선택했을 때의 효과나 의미를 1문장으로 친절하게 설명 (예: "네온 사인과 하이테크 분위기를 연출합니다.")
    - **절대 금지:** 괄호나 복합 조건 금지. 원자 단위로 제안하세요.
5.  **형식:**
    -   주요 응답은 대화체로, 전문적이면서도 격려하는 말투(영화 제작 파트너처럼)를 사용하세요. 한국어로 자연스럽게 대화하세요.
    -   응답의 맨 마지막에는 반드시 JSON 블록을 출력하세요.
6.  **장면 일관성 및 길이:**
    -   장면(Scene)을 구성할 때 등장인물과 배경의 일관성을 유지하세요. "장면 1", "장면 2"와 같이 추적하세요.
    -   **모든 장면의 기본 길이는 6초로 설정하세요.** (사용자가 별도로 지정하지 않는 한 6초로 계산)
7.  **최종 결과물 (필수 - 중요):** 
    사용자가 기획을 마치고 "최종 메타 프롬프트 생성"을 요청하면, 일반 텍스트 대신 **반드시 아래 JSON 포맷**으로 전체 프롬프트를 출력해야 합니다.
    
    **[언어 규칙]**
    -   \`finalPrompt.ko\`: 모든 내용(비주얼 묘사, 대사, 나레이션)을 **한국어**로 작성합니다.
    -   \`finalPrompt.en\`: 비주얼 묘사(Visual Description)와 카메라 연출은 **영어**로 번역하지만, **대사(Dialogue)와 나레이션(Narration)**은 반드시 **한국어 원문 그대로** 유지해야 합니다. (영상 내 들리는 언어는 한국어여야 하기 때문입니다.)

    \`\`\`json
    {
       "finalPrompt": {
          "en": "Title: ... \n[Visual Style] (English)... \n[Scene 1] (Visuals in English) ... \nNarrator: \"한국어 나레이션\" ...",
          "ko": "제목: ... \n[시각 스타일] (한국어)... \n[장면 1] (비주얼 한국어) ... \n나레이션: \"한국어 나레이션\" ..."
       },
       "suggestions": [
          {"label": "다시 만들기", "description": "기획이 마음에 들지 않는다면 처음부터 다시 시작합니다."},
          {"label": "이미지 생성하기", "description": "현재 기획된 장면들의 시각적 예시를 생성합니다."}
       ]
    }
    \`\`\`
    *주의: "finalPrompt" 필드는 기획이 완전히 끝났을 때만 포함하세요. 그 전에는 "suggestions"만 포함합니다.*
8.  **사용자 시나리오 분석 및 수용 (중요):**
    - 사용자가 제안된 장르/키워드를 선택하는 대신, **이미 작성된 시나리오나 구체적인 줄거리**를 입력할 수 있습니다.
    - 이 경우, **즉시 해당 시나리오를 분석**하여 장르, 소재, 분위기가 결정된 것으로 간주하세요. ("컨셉" 단계 완료 처리)
    - "시나리오가 아주 흥미롭네요!"와 같이 긍정적으로 반응한 뒤, 바로 **영상 제작에 필요한 다음 필수 요소(러닝타임, 화면비율, 구체적 비주얼 스타일 등)** 중에서 빠진 부분을 질문하여 기획을 이어가세요. 불필요하게 장르를 다시 묻지 마세요.

**대화 단계:**
1.  **컨셉:** 장르와 주제 설정. (예: "장르부터 정해볼까요?")
2.  **구조:** 러닝타임과 구성. (예: "영상 길이는 어느 정도로 생각하시나요?")
3.  **스타일:** 시각적 스타일과 톤.
4.  **디테일:** 각 장면별 행동, 카메라, 조명.
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

export const parseGeminiResponse = (responseText: string): { cleanText: string; suggestions: Suggestion[]; finalPrompt?: MetaPrompt } => {
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = responseText.match(jsonBlockRegex);

  let suggestions: Suggestion[] = [];
  let finalPrompt: MetaPrompt | undefined = undefined;
  let cleanText = responseText;

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      
      // Extract Suggestions
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        // Handle both string[] (legacy/fallback) and object[] formats
        suggestions = parsed.suggestions.map((s: any) => {
            if (typeof s === 'string') {
                return { label: s, description: "이 옵션을 선택하여 진행합니다." };
            }
            return { label: s.label, description: s.description || "이 옵션을 선택하여 진행합니다." };
        });
      }

      // Extract Final Meta Prompt if present
      if (parsed.finalPrompt && parsed.finalPrompt.en && parsed.finalPrompt.ko) {
          finalPrompt = parsed.finalPrompt;
      }

      // Clean the text by removing the JSON block
      cleanText = responseText.replace(jsonBlockRegex, '').trim();
    } catch (e) {
      console.error("Failed to parse response JSON", e);
    }
  }

  return { cleanText, suggestions, finalPrompt };
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