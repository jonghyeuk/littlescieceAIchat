import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Beaker, Atom, Dna, Globe, BookOpen, Lightbulb, FileText, BarChart3, TestTube, FlaskConical, Download, X, AlertCircle } from 'lucide-react';

export default function ScienceResearchAI() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '안녕! 과학 실험이나 연구 아이디어 있으면 편하게 말해봐! 🧪\n\n어떤 분야에 관심있어? 화학, 생물, 물리, 환경과학... 뭐든 좋아!',
      timestamp: new Date().toLocaleTimeString(),
      isComplete: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResearchTopic, setCurrentResearchTopic] = useState(null);
  const [researchStage, setResearchStage] = useState('exploration');
  
  // 스마트 트리거 상태
  const [conversationDepth, setConversationDepth] = useState(0);
  const [planningButtonEnabled, setPlanningButtonEnabled] = useState(false);
  const [reportButtonEnabled, setReportButtonEnabled] = useState(false);
  
  // 타이핑 애니메이션 상태
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  
  // 문서 생성 상태
  const [documentMode, setDocumentMode] = useState(null);
  const [isDocumentGenerating, setIsDocumentGenerating] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [documentProgress, setDocumentProgress] = useState(0);
  const [documentProgressMessage, setDocumentProgressMessage] = useState('');
  
  // 토큰 사용량 추적
  const [tokenUsage, setTokenUsage] = useState({
    chatMessages: 0,
    systemPrompts: 0,
    generatedDocuments: 0,
    contextOverhead: 0,
    apiCallCount: 0
  });
  
  const messagesEndRef = useRef(null);
  const maxTokens = 20000;
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 토큰 수 추정 함수
  const estimateTokens = (text) => {
    return Math.ceil(text.length / 3.5);
  };

  const calculateUsage = () => {
    const chatTokens = messages.reduce((sum, msg) => 
      sum + estimateTokens(msg.content), 0
    );
    const systemTokens = estimateTokens("시스템프롬프트") * tokenUsage.apiCallCount;
    const documentTokens = documentContent ? estimateTokens(documentContent) : 0;
    const contextOverhead = chatTokens * tokenUsage.apiCallCount * 0.5;
    
    const totalTokens = chatTokens + systemTokens + documentTokens + contextOverhead;
    return Math.min((totalTokens / maxTokens) * 100, 100);
  };

  const getCurrentTokens = () => {
    const chatTokens = messages.reduce((sum, msg) => 
      sum + estimateTokens(msg.content), 0
    );
    const systemTokens = estimateTokens("시스템프롬프트") * tokenUsage.apiCallCount;
    const documentTokens = documentContent ? estimateTokens(documentContent) : 0;
    const contextOverhead = chatTokens * tokenUsage.apiCallCount * 0.5;
    
    return chatTokens + systemTokens + documentTokens + contextOverhead;
  };

  const getUsageColor = () => {
    const usage = calculateUsage();
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 타이핑 애니메이션 효과
  useEffect(() => {
    if (typingMessageIndex !== null) {
      const message = messages[typingMessageIndex];
      if (message && !message.isComplete) {
        const fullText = message.content;
        const speed = 30; // 30ms 타이핑 속도
        
        if (displayedText.length < fullText.length) {
          const timer = setTimeout(() => {
            setDisplayedText(fullText.slice(0, displayedText.length + 1));
          }, speed);
          return () => clearTimeout(timer);
        } else {
          // 타이핑 완료
          setMessages(prev => prev.map((msg, idx) => 
            idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
          ));
          setTypingMessageIndex(null);
          setDisplayedText('');
        }
      }
    }
  }, [typingMessageIndex, displayedText, messages]);

  // 새 메시지 타이핑 시작
  const startTypingMessage = useCallback((messageContent) => {
    const newMessage = {
      role: 'assistant',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString(),
      isComplete: false
    };
    
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      const newIndex = newMessages.length - 1;
      
      setTimeout(() => {
        setTypingMessageIndex(newIndex);
        setDisplayedText('');
      }, 100);
      
      return newMessages;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedText]);

  // 과학 주제 분석 함수 (Claude API 사용)
  const analyzeScientificTopic = async (text, fullConversationHistory = messages) => {
    try {
      const conversationContext = fullConversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      const prompt = `다음 전체 대화맥락을 고려해서 최신 사용자 메시지를 분석해줘:

전체 대화 히스토리:
${conversationContext}

최신 사용자 메시지: "${text}"

위 전체 맥락을 고려해서 과학적 타당성을 판단하고 JSON으로 답변해줘:

{
  "isScientific": true/false,
  "topic": "구체적 과학 주제명 (한국어)",
  "field": "물리/화학/생물/환경/전자/의학/지구과학/천체물리학/기타",
  "experimentable": true/false,
  "safetyLevel": "safe/caution/dangerous",
  "educationalValue": "high/medium/low",
  "reason": "판단 근거 (한 줄)"
}

판단 기준:
- isScientific: 과학적 원리나 현상과 관련된 내용이거나 이전 대화에서 과학적 맥락이 있는가?
- experimentable: 고등학생 수준에서 실험/연구 가능한가?
- safetyLevel: safe(안전), caution(주의필요), dangerous(위험)
- educationalValue: 교육적 가치 정도

안전한 과학 주제들 (항상 safe로 판정):
- 나노튜브, 그래핀, 나노소재, 반도체, 태양전지
- 식물성장, 미세플라스틱, 환경과학, 생물학 실험
- 물리 실험, 화학 실험 (일반적인 수준)
- CVD, SEM, AFM 등 일반적인 분석기법

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const analysis = JSON.parse(responseText);
      
      setTokenUsage(prev => ({
        ...prev,
        apiCallCount: prev.apiCallCount + 1
      }));
      
      return analysis;
    } catch (error) {
      console.error("주제 분석 오류:", error);
      // 폴백 분석 - 키워드 기반으로 간단 분석
      const safeKeywords = ['나노튜브', '실험', '연구', '설계', '분석', 'CVD', 'SEM', 'AFM', '합성', '측정', '관찰', '데이터', '미세플라스틱', '식물', '태양전지', '다이오드'];
      const hasDirectScienceKeywords = safeKeywords.some(keyword => text.includes(keyword));
      
      return {
        isScientific: hasDirectScienceKeywords,
        topic: hasDirectScienceKeywords ? "과학 연구" : "일반 대화",
        field: "기타",
        experimentable: hasDirectScienceKeywords,
        safetyLevel: "safe",
        educationalValue: hasDirectScienceKeywords ? "high" : "low",
        reason: "로컬 키워드 분석 결과"
      };
    }
  };

  // 트리거 활성화 로직
  const updateTriggerStates = async (userMessage) => {
    const analysis = await analyzeScientificTopic(userMessage, messages);
    
    // 안전한 키워드 직접 체크
    const safeKeywords = ['나노튜브', '실험', '연구', '설계', '분석', 'CVD', 'SEM', 'AFM', '합성', '측정', '관찰', '데이터', '미세플라스틱', '식물', '태양전지', '다이오드'];
    const hasDirectScienceKeywords = safeKeywords.some(keyword => 
      messages.some(msg => msg.content.includes(keyword)) || userMessage.includes(keyword)
    );
    
    if (hasDirectScienceKeywords || analysis.isScientific) {
      setPlanningButtonEnabled(true);
      setReportButtonEnabled(true);
      if (!currentResearchTopic) {
        setCurrentResearchTopic(analysis.topic || '과학 실험 연구');
      }
    }
    
    // 부적절한 주제 처리
    if (!analysis.isScientific && !hasDirectScienceKeywords) {
      const warningContent = `오늘은 어떤 과학적인 궁금증이 있어? 🧪

그냥 자연스럽게 얘기해봐! 사람들은 때로는 순서대로, 때로는 랜덤하게 이야기하잖아? 나도 그런 식으로 대화하는 걸 좋아해 😊

예를 들어:
• "아, 그러고 보니 물은 왜 100도에서 끓지?" 
• "어? 식물이 햇빛으로 어떻게 에너지를 만들어?"
• "갑자기 궁금한데, 우리가 보는 색깔은 진짜 다 같은 색깔일까?"

이런 식으로 자연스럽게 과학적 호기심을 표현해봐! ✨`;
      startTypingMessage(warningContent);
      return false;
    }
    
    // 위험한 주제 처리
    if (analysis.safetyLevel === 'dangerous' && !hasDirectScienceKeywords) {
      const safetyContent = `음, 그보다는 안전하면서도 재미있는 실험들을 해보는 게 어때? 🛡️

실제로 해볼 수 있는 안전한 것들이 훨씬 신기하고 배울 게 많거든!

• "집에 있는 재료로 뭔가 재미있는 반응 일으켜볼 수 있을까?"
• "아! 자석으로 전기 만드는 거 진짜 되나?"
• "식초랑 베이킹소다 섞으면 왜 거품이 막 생기지?"

이런 것들 말이야! 어떤 게 궁금해? 🔬`;
      startTypingMessage(safetyContent);
      return false;
    }
    
    // 과학적이고 안전한 주제일 때
    if (analysis.isScientific && analysis.safetyLevel !== 'dangerous') {
      setCurrentResearchTopic(analysis.topic);
      setConversationDepth(prev => prev + 1);
      
      if (analysis.experimentable || hasDirectScienceKeywords) {
        setPlanningButtonEnabled(true);
        
        if (analysis.educationalValue === 'high' || hasDirectScienceKeywords) {
          setReportButtonEnabled(true);
        }
        
        const hasExperimentWords = ['실험해보고 싶', '연구해보고 싶', '설계', '실험방법', '어떻게 해'];
        const isDirectExperimentRequest = hasExperimentWords.some(word => userMessage.includes(word));
        
        if (isDirectExperimentRequest) {
          const previewContent = `오! ${analysis.topic} 실험하고 싶구나! 👍

간단히 말하면... 음, 사실 이런 걸 제대로 설명하려면 좀 복잡한데, 
기본적으로는 이런 식으로 접근할 수 있어:

• 목적: ${analysis.topic}이 어떻게 작동하는지 알아보기
• 방법: 조건을 바꿔가면서 결과 관찰하기  
• 결과: 원리를 이해하고 데이터 분석해보기

어 그런데, **🚀 더 자세한 실험설계는 왼쪽 "연구계획" 버튼을 눌러봐!** 완전 체계적으로 만들어줄게! 🔬`;
          startTypingMessage(previewContent);
          return false;
        }
      }
    }
    
    return true;
  };

  // Claude API 호출 함수 
  const callClaudeAPI = async (conversationHistory, userMessage) => {
    try {
      const fullHistory = [
        {
          role: "user",
          content: `너는 과학 교육을 담당하는 친근하고 열정적인 AI 튜터야. 학생들과 자연스럽게 대화하며 과학적 호기심을 키워주는 것이 목표야.

대화 스타일 (중요 - 자연스러운 강의자료 대본처럼):
- 친근하고 편안한 말투 사용 (반말, 이모지 활용)
- 사람들처럼 때로는 순서대로, 때로는 랜덤하게 자연스럽게 이야기 전개
- 복잡한 과학 개념도 쉽게 설명하되, 실제 대화하듯 자연스럽게
- "아 그러고 보니", "어? 그런데", "잠깐, 이것도 있어" 같은 자연스러운 연결어 사용
- 때로는 주제를 자연스럽게 바꾸거나 새로운 관점 제시
- 실험이나 연구에 대한 구체적인 조언을 자연스럽게 섞어서 제공
- 학생의 호기심을 자극하는 질문을 대화 중간중간 자연스럽게 던지기

중요한 주의사항:
- "언제쯤 시작해볼 생각이야?", "계획이 있어?" 같은 시간 관련 질문은 하지 마
- 불필요한 재촉이나 압박하는 멘트 금지
- 간결하고 핵심적인 답변 위주로 작성
- 과도한 격려보다는 실질적인 도움과 자연스러운 대화 제공

**⚠️ 매우 중요한 버튼 안내 규칙 (반드시 지켜야 함):**
다음 패턴 중 하나라도 감지되면 MUST 반드시 응답 마지막에 "**🎯 왼쪽 연구계획 버튼 눌러봐!**" 포함하기:

**패턴 1: 실험 행동 의도 감지**
- "실험해보고 싶", "해보려고", "만들어보고 싶", "측정해보고 싶", "관찰하고 싶" 등의 행동 의도
- "어떻게 해", "방법이 뭐야", "어떤 재료", "뭘 준비", "어떤 절차" 등의 방법 질문

**패턴 2: 대화 흐름 분석**
- 이전 턴에서 과학 주제 언급 + 현재 턴에서 구체적 세부사항 질문
- 사용자가 2회 이상 연속해서 같은 실험 주제에 대해 질문
- 실험 재료, 절차, 결과에 대한 구체적 질문

**패턴 3: 실험 단계 진행 감지**  
- 내가 실험 방법이나 재료를 설명한 직후
- 여러 실험 옵션을 제시한 후 사용자가 하나를 선택했을 때
- 실험의 원리나 이론을 설명한 후 실행 단계로 넘어갈 때

**패턴 4: 구체화 신호**
- 추상적 궁금증에서 → 구체적 실행 계획으로 대화가 발전할 때
- "이거 진짜 해볼까", "실제로 가능해?", "집에서 할 수 있어?" 같은 실행 의지 표현

현재까지의 대화 맥락을 고려해서 자연스럽고 교육적인 답변을 해줘.`
        },
        ...conversationHistory,
        { role: "user", content: userMessage }
      ];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: fullHistory
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      setTokenUsage(prev => ({
        ...prev,
        apiCallCount: prev.apiCallCount + 1
      }));
      
      return data.content[0].text;
    } catch (error) {
      console.error("Claude API 호출 오류:", error);
      return generateFallbackResponse(userMessage);
    }
  };

  // 폴백 응답 생성
  const generateFallbackResponse = (userInput) => {
    if (userInput.includes('미세플라스틱')) {
      setCurrentResearchTopic('미세플라스틱 분해');
      setPlanningButtonEnabled(true);
      setReportButtonEnabled(true);
      return '오 미세플라스틱! 요즘 진짜 핫한 문제지 🔬\n\n분해 방법에 대해 관심이 많구나! 아 그런데 말이야, 이런 걸 제대로 연구하려면...\n\n어? 그보다 **🎯 왼쪽에 연구계획 버튼이 활성화되었으니 한번 눌러봐!** 실험 설계부터 예상결과까지 체계적으로 정리해줄게! 💪';
    } else if (userInput.includes('다이오드')) {
      setCurrentResearchTopic('다이오드 논리회로');
      setPlanningButtonEnabled(true);
      setReportButtonEnabled(true);
      return '다이오드 논리회로! 전자회로의 기초네 ⚡\n\n실험해보고 싶은 마음이 보이는구나! 그런데 이걸 제대로 해보려면... 음, 생각해보니\n\n**🎯 왼쪽 사이드바에 연구계획 버튼이 활성화되었어!** 클릭하면 AND, OR 게이트 실험부터 결과 예측까지 완벽하게 설계해줄게! 🎯';
    } else if (userInput.includes('식물')) {
      setCurrentResearchTopic('식물 성장 연구');
      setPlanningButtonEnabled(true);
      setReportButtonEnabled(true);
      return '식물 성장 연구! 생명과학의 핵심이야 🌱\n\n어떤 조건에서 식물이 더 잘 자랄지 궁금하지? 광합성, 영양소, 환경 요인들이 모두 관련되어 있어!\n\n실험해보고 싶다면... 아, 그냥 이렇게 말하는 것보다 연구계획부터 체계적으로 세워보자! 🌿';
    } else if (userInput.includes('태양')) {
      setCurrentResearchTopic('태양에너지 연구');
      setPlanningButtonEnabled(true);
      setReportButtonEnabled(true);
      return '태양에너지! 미래의 핵심 기술이지 ☀️\n\n태양전지 효율을 높이는 방법이나 태양광 발전 원리가 궁금해? 정말 흥미로운 분야야!\n\n실제로 실험해볼 수 있는 프로젝트들도 많아. 한번 연구계획을 세워볼까? 🔋';
    } else {
      return '흥미로운 주제네! 🤔\n\n과학에서 궁금한 건 뭐든 물어봐. 실험으로 확인해볼 수 있는 건지도 같이 생각해보자!\n\n혹시 구체적으로 어떤 분야에 관심있어? 화학, 생물, 물리, 환경과학... 뭐든 좋아! ✨';
    }
  };

  // 대회 출품작 검색
  const triggerCompetitionSearch = async () => {
    setIsLoading(true);
    
    const conversationText = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => msg.content)
      .join(' ');
    
    try {
      let response = '';
      
      if (messages.length <= 2) {
        response = `안녕! 🏆 우리는 **ISEF 국제대회**와 **국내 과학대회** 출품작 데이터를 가지고 있어!

📂 **보유 분야들:**
🌍 **환경과학** - 미세플라스틱, 물정화, 대기오염, 생태계 복원
⚡ **전자공학** - 다이오드 회로, AI 시스템, 센서 기술  
🧬 **생물학** - 식물성장, 미생물, 유전자, 의료진단
🔋 **에너지** - 태양전지, 배터리, 신재생에너지
🧪 **화학** - 촉매, 신소재, 분석기술
🤖 **AI/데이터** - 머신러닝, 의료AI, 예측모델

어떤 분야가 관심있어? 또는 구체적인 주제가 있다면 말해줘! 🎯`;
      } else {
        const prompt = `다음 대화 내용을 분석해서 관련된 과학대회 출품작 아이디어를 자연스러운 대화 형식으로 제공해줘:

대화 내용: "${conversationText.slice(-1000)}"

자연스럽고 강의자료 대본처럼 답변해줘. 사람들이 실제로 대화하듯, 때로는 순서대로, 때로는 랜덤하게 자연스럽게 이야기를 전개해줘.

다음 형식으로 답변해줘:

🎯 **대화 맥락 분석 완료!** [주제]와 관련된 연구 아이디어들이야!

## 🔬 **[분야명]** 분야

### 🌍 **국제 수준 연구 아이디어**
**1. [연구 제목]**
   📂 *[카테고리]* | 🎯 *고등학생 실행 가능*

**2. [연구 제목]**
   📂 *[카테고리]* | 🎯 *창의적 접근*

### 🇰🇷 **국내대회 적합 아이디어**
**1. [연구 제목]**
   📂 *STEAM R&E* | 🎯 *실용적 응용*

**2. [연구 제목]**
   📂 *과학전람회* | 🎯 *지역 문제 해결*

## 🚀 **너만의 연구 아이디어는?**

위 아이디어들을 참고해서 어떤 방향으로 연구하고 싶어? 기존 연구를 개선하거나 새로운 관점으로 접근해볼 수 있을 것 같아! 🎯

조건: 고등학생이 실제로 수행 가능한 연구, 창의적이고 실용적인 아이디어 제공, 자연스러운 대화체로 작성`;

        const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!apiResponse.ok) {
          throw new Error(`API 호출 실패: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        response = data.content[0].text;
        
        setTokenUsage(prev => ({
          ...prev,
          apiCallCount: prev.apiCallCount + 1
        }));
      }
      
      startTypingMessage(response);
    } catch (error) {
      console.error("대회 출품작 검색 오류:", error);
      
      const fallbackResponse = `🔍 연구 아이디어를 찾아보고 있어!

혹시 이런 분야 중에 관심있는 게 있어?
• **환경**: 플라스틱 오염, 수질 정화, 대기질 개선
• **전자**: 회로 설계, 센서, AI 하드웨어  
• **생물**: 식물/동물 연구, 의료 기술
• **에너지**: 태양광, 배터리, 신재생에너지
• **화학**: 신소재, 촉매, 분석 기술

구체적인 주제를 말해주면 맞춤형 연구 아이디어를 제안해줄게! 🎯`;
      
      startTypingMessage(fallbackResponse);
    }
    
    setIsLoading(false);
  };

  // 고급 문서 생성 함수
  const generateAdvancedDocument = async (type) => {
    const topic = currentResearchTopic || '과학 실험';
    const conversationContext = messages.slice(-5).map(msg => msg.content).join('\n');
    
    try {
      const prompt = type === 'research-plan' 
        ? `다음 주제로 고등학생이 쉽게 따라할 수 있는 상세한 실험계획서를 작성해줘: "${topic}"
          
          대화 맥락: ${conversationContext}
          
          자연스럽고 강의자료 대본처럼 작성해줘. 사람들이 실제로 대화하듯, 때로는 순서대로, 때로는 랜덤하게 자연스럽게 이야기를 전개하되 체계적인 구조는 유지해줘.
          
          다음 구조로 상세하고 실용적으로 작성해줘:
          1. 실험 제목 - 명확하고 간단하게
          2. 실험 목적 및 가설 - 왜 이 실험을 하는지, 예상 결과
          3. 준비물 - 실제 구할 수 있는 재료들 (7-10개 정도), 각각의 역할 설명
          4. 실험 방법 - 단계별로 따라하기 쉽게 (7-10단계), 각 단계별 주의사항
          5. 관찰할 데이터 - 뭘 측정하고 기록할지, 데이터 기록 방법
          6. 예상 결과 및 해석 - 어떤 결과가 나올지, 그 의미는 무엇인지
          7. 안전 수칙 - 실험시 주의할 점들
          8. 더 알아보기 - 검색 키워드와 추가 질문들, 추천 검색 사이트
          9. 튜터에게 질문하기 - 어떻게 질문하면 좋은지 가이드
          
          **더 알아보기 섹션에는:**
          - 배경지식 검색용 키워드들 제시
          - 구글 학술검색, 네이버 학술정보 등 추천 사이트
          - "이런 키워드로 더 깊이 공부해보세요" 안내
          
          **튜터 질문 가이드 섹션에는:**
          - 구체적인 질문 예시들 제공
          - "이해 안 되는 부분은 언제든 물어보세요" 안내
          
          HTML 형식으로 답변하고, 2500자 내외로 상세하면서도 실용적으로 작성해줘.
          고등학생이 "이거 해볼 만하다!"라고 생각할 수 있는 수준으로 해줘.
          
          **중요: 메인 제목은 28px 크기로, 섹션 제목은 16px 크기로 만들어줘.**`
        : `다음 주제로 고등학생이 이해하기 쉬운 상세한 실험보고서를 작성해줘: "${topic}"
          
          대화 맥락: ${conversationContext}
          
          자연스럽고 강의자료 대본처럼 작성해줘. 사람들이 실제로 대화하듯, 때로는 순서대로, 때로는 랜덤하게 자연스럽게 이야기를 전개하되 보고서 형식은 유지해줘.
          
          다음 구조로 매우 상세하고 실용적으로 작성해줘:
          1. 실험 목적 및 배경 - 왜 이 실험을 했는지, 관련 이론과 연구 배경 상세히
          2. 실험 가설 - 예상되는 결과와 그 근거
          3. 실험 재료 및 상세 방법 - 누가 봐도 따라할 수 있을 정도로 매우 구체적으로
          4. 실험 결과 - 가상의 실험 데이터와 관찰 내용, 그래프나 표 형태
          5. 결과 분석 및 토의 - 데이터가 뭘 의미하는지, 가설과의 비교
          6. 결론 - 실험에서 알게 된 점, 가설 검증 여부
          7. 오차 분석 - 실험 과정에서 발생할 수 있는 오차 요인들
          8. 개선점 및 후속 연구 - 더 나은 실험 방법과 추가 연구 아이디어
          9. 참고문헌 - 샘플 형식 + 검색 키워드 가이드 (마지막에 위치)
          10. 튜터 질문 가이드 - 이해 안 되는 부분 질문하는 방법
          
          **실험 방법 섹션은 특히 상세하게:**
          - 준비물의 정확한 규격과 수량
          - 단계별 실험 과정을 【준비단계】【1단계】식으로 구분
          - 각 단계마다 소요 시간과 주의사항 명시
          - 측정 방법과 기록 방식 구체적으로 설명
          - 안전 수칙도 별도로 강조
          
          **실험 목적 및 배경도 더 상세하게:**
          - 이론적 근거와 선행 연구 내용
          - 실험의 교육적 의의
          - 과학적 탐구 과정으로서의 가치
          
          HTML 형식으로 답변하고, 3500자 내외로 매우 상세하면서도 과학적으로 작성해줘.
          가상의 실험 데이터를 포함해서 실제 보고서처럼 만들어줘.
          **중요: 메인 제목은 34px 크기로 크게 만들어줘.**`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 15000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      let generatedDocument = data.content[0].text;
      
      // HTML 마크다운 코드 블록 완전 제거
      generatedDocument = generatedDocument
        .replace(/```html\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^html\s*/gm, "")
        .trim();
      
      // 제목 크기 강제 수정
      generatedDocument = generatedDocument
        .replace(/(<h1[^>]*font-size:\s*)\d+px/g, '$134px')
        .replace(/(<h2[^>]*font-size:\s*)\d+px/g, '$116px')
        .replace(/(<h1[^>]*style="[^"]*)(">)/g, '$1; font-size: 34px; font-weight: 700;$2')
        .replace(/(<h2[^>]*style="[^"]*)(">)/g, '$1; font-size: 16px; font-weight: 600;$2');
      
      // 토큰 사용량 업데이트
      setTokenUsage(prev => ({
        ...prev,
        apiCallCount: prev.apiCallCount + 1,
        generatedDocuments: prev.generatedDocuments + estimateTokens(generatedDocument)
      }));
      
      return generatedDocument;
    } catch (error) {
      console.error("문서 생성 오류:", error);
      return generateSimpleDocument(type); // 폴백으로 간단한 문서 생성
    }
  };

  // 간단한 문서 생성 함수 (폴백용)
  const generateSimpleDocument = (type) => {
    const topic = currentResearchTopic || '과학 실험';
    
    if (type === 'research-plan') {
      return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 10px; line-height: 1.3; color: #1f2937; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 12px;">
    <h1 style="color: #1e40af; font-size: 28px; font-weight: 700; margin: 0 0 6px 0; border-bottom: 2px solid #3b82f6; padding-bottom: 4px;">${topic} 실험계획서</h1>
    <p style="color: #6b7280; font-size: 10px; margin: 4px 0 0 0;">상세한 실험 가이드</p>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">🎯 실험 제목 및 목적</h2>
    <div style="padding: 8px; background-color: #f0f9ff; border-radius: 4px;">
      <h3 style="margin: 0 0 4px 0; color: #1e40af; font-size: 13px;">"${topic}의 효과 확인 및 분석"</h3>
      <p style="margin: 0; color: #374151; font-size: 10px;"><strong>목적:</strong> ${topic}의 작동 원리를 이해하고 관련 변수들의 영향을 실험적으로 검증합니다.</p>
      <p style="margin: 4px 0 0 0; color: #374151; font-size: 10px;"><strong>가설:</strong> 조건을 변화시키면 관찰 가능한 결과의 차이가 나타날 것입니다.</p>
    </div>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">🧪 준비물 및 역할</h2>
    <div style="padding: 6px; background-color: #f8fafc; border-radius: 4px;">
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• 투명한 컵 3개</strong> - 실험군과 대조군 구분용</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• 증류수 300ml</strong> - 기본 용매로 사용</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• A 재료 (실험용)</strong> - 주요 실험 변수</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• B 재료 (비교용)</strong> - 대조군 설정용</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• 교반 막대</strong> - 균일한 혼합을 위해</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• 라벨지 및 펜</strong> - 시료 구분 표시용</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• 스마트폰/카메라</strong> - 변화 과정 기록용</div>
      <div style="margin: 3px 0; color: #374151; font-size: 10px;"><strong>• 온도계</strong> - 환경 조건 모니터링</div>
      <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 9px;">💰 예상 비용: 약 2-3만원</p>
    </div>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">📋 상세 실험 방법</h2>
    <div style="padding: 6px; background-color: #f0fdf4; border-radius: 4px;">
      <div style="margin: 4px 0; padding: 3px; background-color: #ecfdf5; border-left: 3px solid #10b981; border-radius: 2px;">
        <strong style="color: #047857; font-size: 10px;">1단계: 사전 준비</strong>
        <div style="color: #374151; font-size: 9px; margin: 2px 0;">컵에 라벨 붙이기 (실험군1, 실험군2, 대조군), 실온 확인 및 기록</div>
      </div>
      <div style="margin: 4px 0; padding: 3px; background-color: #ecfdf5; border-left: 3px solid #10b981; border-radius: 2px;">
        <strong style="color: #047857; font-size: 10px;">2단계: 기본 설정</strong>
        <div style="color: #374151; font-size: 9px; margin: 2px 0;">각 컵에 증류수 100ml씩 정확히 넣기, 초기 상태 사진 촬영</div>
      </div>
      <div style="margin: 4px 0; padding: 3px; background-color: #ecfdf5; border-left: 3px solid #10b981; border-radius: 2px;">
        <strong style="color: #047857; font-size: 10px;">3단계: 실험 조건 설정</strong>
        <div style="color: #374151; font-size: 9px; margin: 2px 0;">실험군1: A재료 적정량, 실험군2: A재료 2배량, 대조군: B재료 또는 무첨가</div>
      </div>
      <div style="margin: 4px 0; padding: 3px; background-color: #ecfdf5; border-left: 3px solid #10b981; border-radius: 2px;">
        <strong style="color: #047857; font-size: 10px;">4단계: 반응 시작</strong>
        <div style="color: #374151; font-size: 9px; margin: 2px 0;">각각 30초간 일정한 속도로 저어주기, 시작 시간 기록</div>
      </div>
      <div style="margin: 4px 0; padding: 3px; background-color: #ecfdf5; border-left: 3px solid #10b981; border-radius: 2px;">
        <strong style="color: #047857; font-size: 10px;">5단계: 지속 관찰</strong>
        <div style="color: #374151; font-size: 9px; margin: 2px 0;">5분, 10분, 15분, 30분 간격으로 변화 관찰 및 사진 촬영</div>
      </div>
      <div style="margin: 4px 0; padding: 3px; background-color: #ecfdf5; border-left: 3px solid #10b981; border-radius: 2px;">
        <strong style="color: #047857; font-size: 10px;">6단계: 데이터 정리</strong>
        <div style="color: #374151; font-size: 9px; margin: 2px 0;">관찰 내용을 표로 정리, 최종 상태 기록</div>
      </div>
    </div>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">📊 관찰 데이터 및 기록법</h2>
    <div style="padding: 6px; background-color: #fefce8; border-radius: 4px;">
      <div style="margin: 2px 0; color: #374151; font-size: 10px;">• <strong>색깔 변화:</strong> RGB 코드나 색상명으로 정확히 기록</div>
      <div style="margin: 2px 0; color: #374151; font-size: 10px;">• <strong>침전물 생성:</strong> 양과 형태, 생성 시점 기록</div>
      <div style="margin: 2px 0; color: #374151; font-size: 10px;">• <strong>거품 발생:</strong> 크기와 지속 시간 측정</div>
      <div style="margin: 2px 0; color: #374151; font-size: 10px;">• <strong>온도 변화:</strong> 각 시점별 온도 측정</div>
      <div style="margin: 2px 0; color: #374151; font-size: 10px;">• <strong>pH 변화:</strong> 가능하면 리트머스 종이로 확인</div>
      <div style="margin: 2px 0; color: #374151; font-size: 10px;">• <strong>기타 특이사항:</strong> 냄새, 투명도 등</div>
    </div>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">⚠️ 안전 수칙</h2>
    <div style="padding: 6px; background-color: #fef2f2; border-radius: 4px; border-left: 3px solid #ef4444;">
      <div style="margin: 2px 0; color: #dc2626; font-size: 10px;">• 환기가 잘 되는 곳에서 실험</div>
      <div style="margin: 2px 0; color: #dc2626; font-size: 10px;">• 실험 중 음식 섭취 금지</div>
      <div style="margin: 2px 0; color: #dc2626; font-size: 10px;">• 화학 물질 직접 접촉 피하기</div>
      <div style="margin: 2px 0; color: #dc2626; font-size: 10px;">• 실험 후 손 깨끗이 씻기</div>
    </div>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">🔍 더 알아보기</h2>
    <div style="padding: 6px; background-color: #fefce8; border-radius: 4px;">
      <p style="margin: 0 0 3px 0; color: #1e40af; font-size: 10px; font-weight: 500;">📚 배경지식 검색 키워드:</p>
      <div style="margin: 2px 0; color: #374151; font-size: 9px;">• "${topic} 원리" • "${topic} 실험방법" • "${topic} 연구사례"</div>
      <div style="margin: 2px 0; color: #374151; font-size: 9px;">• "${topic} 메커니즘" • "${topic} 응용분야" • "${topic} 최신동향"</div>
      
      <div style="margin: 6px 0 2px 0; padding: 4px; background-color: #ddd6fe; border-radius: 3px;">
        <p style="margin: 0 0 2px 0; color: #5b21b6; font-size: 9px; font-weight: 600;">💡 추천 검색 사이트:</p>
        <div style="margin: 1px 0; color: #5b21b6; font-size: 8px;">• 구글 학술검색 (scholar.google.com)</div>
        <div style="margin: 1px 0; color: #5b21b6; font-size: 8px;">• 네이버 학술정보 (academic.naver.com)</div>
        <div style="margin: 1px 0; color: #5b21b6; font-size: 8px;">• 국가과학기술정보센터 (www.ndsl.kr)</div>
      </div>
    </div>
  </div>
  
  <div style="margin-bottom: 12px;">
    <h2 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 6px 0; border-bottom: 1px solid #3b82f6; padding-bottom: 2px;">💬 튜터에게 질문하기</h2>
    <div style="padding: 6px; background-color: #f0f9ff; border-radius: 4px; border-left: 3px solid #3b82f6;">
      <p style="margin: 0 0 4px 0; color: #1e40af; font-size: 10px; font-weight: 500;">🤔 이해가 어려운 부분이 있나요? 이렇게 질문해보세요:</p>
      <div style="margin: 2px 0; color: #374151; font-size: 9px;">• "실험 방법 3단계에서 A재료 적정량이 얼마나 되나요?"</div>
      <div style="margin: 2px 0; color: #374151; font-size: 9px;">• "온도 변화를 측정하는 이유가 뭔가요?"</div>
      <div style="margin: 2px 0; color: #374151; font-size: 9px;">• "대조군을 왜 설정해야 하나요?"</div>
      <div style="margin: 2px 0; color: #374151; font-size: 9px;">• "실험에서 예상되는 결과가 뭔가요?"</div>
      <p style="margin: 4px 0 0 0; color: #1e40af; font-size: 9px; font-style: italic;">💡 구체적이고 명확한 질문일수록 더 정확한 답변을 받을 수 있어요!</p>
    </div>
  </div>
  
  <div style="margin-top: 12px; padding: 6px; background-color: #f8fafc; border-left: 2px solid #3b82f6; border-radius: 4px;">
    <p style="margin: 0; color: #6b7280; text-align: center; font-size: 9px;">
      <strong>⏰ 실험 시간:</strong> 총 1시간<br>
      <strong>🎯 난이도:</strong> ⭐⭐⭐☆☆<br>
      <em>과학연구설계AI</em>
    </p>
  </div>
</div>
      `;
    } else {
      return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 15px; line-height: 1.4; color: #1f2937; background: #ffffff; max-width: 100%; word-wrap: break-word;">
  
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #047857; font-size: 34px; font-weight: 700; margin: 0 0 8px 0; border-bottom: 3px solid #10b981; padding-bottom: 8px; display: inline-block;">${topic} 실험보고서</h1>
    <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">AI 실시간 상세 문서 생성</p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">🎯 1. 실험 목적 및 배경</h2>
    
    <p style="margin: 0 0 8px 0; color: #374151; font-size: 12px; line-height: 1.5;"><strong>목적:</strong> ${topic}에 대한 실험적 검증을 수행하여 이론과 실제를 연결하고, 관련 현상의 메커니즘을 정확히 이해합니다. 이를 통해 과학적 탐구 능력을 기르고 실험 설계의 원리를 학습합니다.</p>
    
    <p style="margin: 8px 0; color: #374151; font-size: 12px; line-height: 1.5;"><strong>연구 배경:</strong> ${topic}는 현재 과학 분야에서 중요한 연구 주제로, 다양한 응용 가능성을 가지고 있습니다. 최근 관련 분야의 연구가 활발해지면서 실험적 검증의 필요성이 대두되었습니다.</p>
    
    <div style="margin: 12px 0; padding: 10px; background-color: #f0fdf4; border-radius: 6px; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 6px 0; color: #047857; font-size: 12px; font-weight: 600;">이론적 근거:</p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 11px;">
        <li>기존 과학 이론에서 ${topic} 현상에 대한 기본 원리 확립</li>
        <li>여러 선행 연구에서 관련 변수들 간의 상관관계 보고</li>
        <li>실험 조건에 따른 결과 예측이 이론적으로 가능</li>
        <li>교육적 가치가 높아 학습 도구로서 활용도 우수</li>
      </ul>
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">📋 2. 실험 가설</h2>
    <div style="padding: 10px; background-color: #f0f9ff; border-radius: 6px;">
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 11px;">
        <li><strong>주가설:</strong> 독립변수 변화가 종속변수에 유의미한 영향을 미칠 것</li>
        <li><strong>부가설:</strong> 실험 조건에 따라 일정한 패턴을 보일 것</li>
        <li><strong>영가설:</strong> 실험 조건 변화는 결과에 영향을 주지 않을 것</li>
      </ul>
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">🔬 3. 실험 재료 및 상세 방법</h2>
    
    <div style="margin: 12px 0; padding: 10px; background-color: #f8fafc; border-radius: 6px;">
      <p style="margin: 0 0 6px 0; color: #047857; font-size: 12px; font-weight: 600;">실험 재료:</p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 11px;">
        <li>A용액 100mL (주실험 물질) - 농도 5% 표준용액</li>
        <li>B용액 50mL (대조 물질) - 증류수 또는 무반응 용액</li>
        <li>증류수 200mL, 100mL 비커 3개 (투명, 눈금 있는 것)</li>
        <li>10mL 피펫 2개, 교반 막대, 디지털온도계</li>
        <li>pH 측정지, 타이머, 카메라, 보안경</li>
      </ul>
    </div>
    
    <div style="margin: 12px 0; padding: 10px; background-color: #f0fdf4; border-radius: 6px;">
      <p style="margin: 0 0 8px 0; color: #047857; font-size: 12px; font-weight: 600;">상세 실험 절차:</p>
      
      <div style="margin: 8px 0; padding: 8px; background-color: #ecfdf5; border-left: 3px solid #10b981;">
        <strong style="color: #047857; font-size: 11px;">【준비 단계】 (5분)</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 16px; color: #374151; font-size: 10px;">
          <li>실험대 정리, 환기 확인, 보안경 착용</li>
          <li>모든 기구를 증류수로 세척 후 건조</li>
          <li>비커에 라벨 부착: "실험군1", "실험군2", "대조군"</li>
        </ul>
      </div>
      
      <div style="margin: 8px 0; padding: 8px; background-color: #ecfdf5; border-left: 3px solid #10b981;">
        <strong style="color: #047857; font-size: 11px;">【1단계: 기본 설정】 (5분)</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 16px; color: #374151; font-size: 10px;">
          <li>각 비커에 증류수 80mL씩 정확히 측정하여 넣기</li>
          <li>초기 온도 측정 및 기록 (3회 측정 후 평균값)</li>
          <li>초기 상태 사진 촬영</li>
        </ul>
      </div>
      
      <div style="margin: 8px 0; padding: 8px; background-color: #ecfdf5; border-left: 3px solid #10b981;">
        <strong style="color: #047857; font-size: 11px;">【2단계: 물질 첨가】 (3분)</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 16px; color: #374151; font-size: 10px;">
          <li>실험군1: A용액 5mL, 실험군2: A용액 10mL</li>
          <li>대조군: B용액 5mL 또는 무첨가</li>
          <li>첨가 시간 기록 (T=0)</li>
        </ul>
      </div>
      
      <div style="margin: 8px 0; padding: 8px; background-color: #ecfdf5; border-left: 3px solid #10b981;">
        <strong style="color: #047857; font-size: 11px;">【3단계: 관찰 및 측정】 (30분)</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 16px; color: #374151; font-size: 10px;">
          <li>각 비커를 30초간 일정속도로 저어주기</li>
          <li>T=0, 5분, 10분, 15분, 30분에 측정</li>
          <li>온도, pH, 색상 변화 기록 및 사진 촬영</li>
        </ul>
      </div>
    </div>
    
    <div style="margin: 8px 0; padding: 8px; background-color: #fef2f2; border-radius: 4px; border-left: 3px solid #ef4444;">
      <p style="margin: 0; color: #dc2626; font-size: 10px; font-weight: 600;">⚠️ 안전 수칙: 화학물질 직접 접촉 금지, 실험 중 음식 섭취 금지, 이상 반응시 즉시 중단</p>
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">📊 4. 실험 결과</h2>
    <div style="padding: 10px; background-color: #f0fdf4; border-radius: 6px;">
      <p style="margin: 0 0 6px 0; color: #047857; font-size: 12px; font-weight: 600;">정량적 데이터:</p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 11px;">
        <li><strong>실험군1:</strong> 초기값 23.4±0.2, 최종값 45.7±0.8 (변화율: 95.7%)</li>
        <li><strong>실험군2:</strong> 초기값 23.1±0.3, 최종값 46.2±0.6 (변화율: 100.0%)</li>
        <li><strong>대조군:</strong> 초기값 23.2±0.1, 최종값 23.8±0.2 (변화율: 2.6%)</li>
      </ul>
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">💡 5. 결론</h2>
    <div style="padding: 10px; background-color: #fef7ff; border-radius: 6px;">
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 11px;">
        <li>실험 가설이 통계적으로 검증되었음 (p<0.001)</li>
        <li>${topic}의 효과가 명확히 관찰되었음</li>
        <li>농도와 효과 간의 양의 상관관계 확인</li>
      </ul>
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">📚 6. 참고문헌</h2>
    <div style="padding: 10px; background-color: #f0f9ff; border-radius: 6px;">
      <p style="margin: 0 0 6px 0; color: #047857; font-size: 12px; font-weight: 600;">참고문헌 형식 예시:</p>
      <ul style="margin: 0 0 8px 0; padding-left: 20px; color: #374151; font-size: 10px; font-family: monospace;">
        <li>김○○, 이○○ (2023). ${topic} 실험적 연구. 한국과학학회지, 45(2), 123-135.</li>
        <li>Smith, J. et al. (2024). Advanced Methods in ${topic}. Nature, 587, 45-52.</li>
      </ul>
      
      <div style="padding: 8px; background-color: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
        <p style="margin: 0 0 4px 0; color: #92400e; font-size: 10px; font-weight: 600;">🔍 레퍼런스 검색 가이드:</p>
        <p style="margin: 0; color: #92400e; font-size: 9px;">구글 학술검색에서 "${topic} 연구논문", "${topic} 실험방법", "${topic} 최신동향" 등의 키워드로 검색하세요!</p>
      </div>
    </div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h2 style="color: #047857; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 4px;">💬 7. 튜터에게 질문하기</h2>
    <div style="padding: 10px; background-color: #f0f9ff; border-radius: 6px; border-left: 3px solid #3b82f6;">
      <p style="margin: 0 0 6px 0; color: #1e40af; font-size: 12px; font-weight: 600;">🤔 궁금한 점이 있나요? 이렇게 질문해보세요:</p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 10px;">
        <li>"변화율 95.7%가 정확히 뭘 의미하는 건가요?"</li>
        <li>"이 실험을 실제로 하려면 어떤 준비가 더 필요해요?"</li>
        <li>"결과 해석 부분을 더 쉽게 설명해주세요"</li>
      </ul>
      <p style="margin: 6px 0 0 0; color: #1e40af; font-size: 9px; font-style: italic;">💡 어떤 부분이든 궁금하면 언제든 물어보세요!</p>
    </div>
  </div>
  
  <div style="margin-top: 20px; padding: 10px; background-color: #f8fafc; border-left: 3px solid #10b981; border-radius: 6px; text-align: center;">
    <p style="margin: 0; color: #6b7280; font-size: 10px;">
      <strong>📝 실험 기간:</strong> 총 3주 | <strong>🎯 신뢰도:</strong> ⭐⭐⭐⭐☆ | <strong>📊 데이터 포인트:</strong> 120개<br>
      <em>과학연구설계AI</em>
    </p>
  </div>
  
</div>
      `;
    }
  };

  // 연구계획서 생성
  const triggerResearchPlan = async () => {
    setDocumentMode('research-plan');
    setIsDocumentGenerating(true);
    setDocumentProgress(0);
    setDocumentProgressMessage('🔬 연구계획서 생성을 시작합니다...');
    
    const messageContent = '🔬 연구계획서를 생성하고 있습니다...\n\n우측 문서 창에서 실시간으로 작성되는 모습을 확인해보세요! AI가 대화 맥락을 분석해서 맞춤형 연구계획을 만들어드릴게요! ✨\n\n💡 **문서를 보면서 궁금한 점이 생기면 언제든 저에게 물어보세요!** 예를 들어:\n• "실험 방법 2단계가 이해 안 되는데 더 자세히 설명해줘"\n• "준비물 중에서 대체할 수 있는 재료 있어?"\n• "이 실험에서 주의할 점이 더 있을까?"\n\n이렇게 구체적으로 질문하시면 더 상세한 답변을 드릴 수 있어요!';
    startTypingMessage(messageContent);
    
    // 균등한 진행률 단계들
    const progressSteps = [
      { progress: 12, message: '📚 대화 맥락 분석 중...' },
      { progress: 25, message: '🎯 연구 목적 설정 중...' },
      { progress: 40, message: '🔬 실험 설계 구성 중...' },
      { progress: 55, message: '📊 데이터 분석 계획 수립 중...' },
      { progress: 70, message: '📝 문서 형식 정리 중...' },
      { progress: 85, message: '🔍 내용 검증 중...' },
      { progress: 92, message: '✨ 최종 검토 중...' }
    ];
    
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setDocumentProgress(progressSteps[stepIndex].progress);
        setDocumentProgressMessage(progressSteps[stepIndex].message);
        stepIndex++;
      }
    }, 600); // 600ms 간격
    
    try {
      const document = await generateAdvancedDocument('research-plan');
      clearInterval(progressInterval);
      setDocumentProgress(100);
      setDocumentProgressMessage('✅ 연구계획서 생성 완료!');
      setTimeout(() => {
        setDocumentContent(document);
        setIsDocumentGenerating(false);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      const fallbackDocument = generateSimpleDocument('research-plan');
      setDocumentProgress(100);
      setDocumentProgressMessage('✅ 연구계획서 생성 완료!');
      setTimeout(() => {
        setDocumentContent(fallbackDocument);
        setIsDocumentGenerating(false);
      }, 500);
    }
    
    setReportButtonEnabled(true);
  };

  // 실험보고서 생성
  const triggerExperimentReport = async () => {
    setDocumentMode('experiment-report');
    setIsDocumentGenerating(true);
    setDocumentProgress(0);
    setDocumentProgressMessage('📝 실험보고서 생성을 시작합니다...');
    
    const messageContent = '📝 실험보고서를 생성하고 있습니다...\n\n우측 문서 창에서 가상의 실험 데이터와 함께 완성되는 보고서를 확인해보세요! 실제 과학 논문 형태로 작성해드릴게요! 📊\n\n💡 **보고서 내용 중 이해가 어려운 부분이 있으면 바로 질문하세요!** 예를 들어:\n• "실험 결과에서 변화율 95.7%가 뭘 의미해?"\n• "결론 부분을 더 쉽게 설명해줘"\n• "이 실험을 실제로 하려면 뭘 조심해야 해?"\n\n구체적으로 물어보실수록 정확하고 자세한 설명을 받을 수 있어요!';
    startTypingMessage(messageContent);
    
    const progressSteps = [
      { progress: 12, message: '🎯 실험 목적 분석 중...' },
      { progress: 25, message: '🧪 실험 방법 구성 중...' },
      { progress: 40, message: '📊 가상 데이터 생성 중...' },
      { progress: 55, message: '📈 결과 분석 및 그래프 작성 중...' },
      { progress: 70, message: '💡 결론 및 토의 작성 중...' },
      { progress: 85, message: '📚 참고문헌 정리 중...' },
      { progress: 95, message: '🔍 최종 검토 및 형식 정리 중...' }
    ];
    
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setDocumentProgress(progressSteps[stepIndex].progress);
        setDocumentProgressMessage(progressSteps[stepIndex].message);
        stepIndex++;
      }
    }, 700);
    
    try {
      const document = await generateAdvancedDocument('experiment-report');
      clearInterval(progressInterval);
      setDocumentProgress(100);
      setDocumentProgressMessage('✅ 실험보고서 생성 완료!');
      setTimeout(() => {
        setDocumentContent(document);
        setIsDocumentGenerating(false);
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      const fallbackDocument = generateSimpleDocument('experiment-report');
      setDocumentProgress(100);
      setDocumentProgressMessage('✅ 실험보고서 생성 완료!');
      setTimeout(() => {
        setDocumentContent(fallbackDocument);
        setIsDocumentGenerating(false);
      }, 1000);
    }
  };

  // 전체 리셋 함수
  const resetAllData = () => {
    setMessages([
      {
        role: 'assistant',
        content: '안녕! 과학 실험이나 연구 아이디어 있으면 편하게 말해봐! 🧪\n\n어떤 분야에 관심있어? 화학, 생물, 물리, 환경과학... 뭐든 좋아!',
        timestamp: new Date().toLocaleTimeString(),
        isComplete: true
      }
    ]);
    setInputValue('');
    setIsLoading(false);
    setCurrentResearchTopic(null);
    setResearchStage('exploration');
    setConversationDepth(0);
    setPlanningButtonEnabled(false);
    setReportButtonEnabled(false);
    setTypingMessageIndex(null);
    setDisplayedText('');
    setDocumentMode(null);
    setIsDocumentGenerating(false);
    setDocumentContent('');
    setDocumentProgress(0);
    setDocumentProgressMessage('');
    
    setTokenUsage({
      chatMessages: 0,
      systemPrompts: 0,
      generatedDocuments: 0,
      contextOverhead: 0,
      apiCallCount: 0
    });
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    // 트리거 상태 업데이트
    const shouldContinue = await updateTriggerStates(currentInput);
    
    if (!shouldContinue) {
      setIsLoading(false);
      return;
    }

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await callClaudeAPI(conversationHistory, currentInput);
      
      // 연구 주제 자동 설정
      if (currentInput.includes('미세플라스틱')) {
        setCurrentResearchTopic('미세플라스틱 분해');
      } else if (currentInput.includes('다이오드')) {
        setCurrentResearchTopic('다이오드 논리회로');
      } else if (currentInput.includes('식물')) {
        setCurrentResearchTopic('식물 성장 연구');
      } else if (currentInput.includes('태양')) {
        setCurrentResearchTopic('태양에너지 연구');
      }

      startTypingMessage(response);
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      const fallbackResponse = "잠시 네트워크 상태를 확인해주세요 🌐\n\n연결이 불안정해서 응답할 수 없어요. 잠시 후 다시 시도해보세요!";
      startTypingMessage(fallbackResponse);
    }
    
    setIsLoading(false);
  };

  const quickTopics = [
    { icon: Atom, text: "미세플라스틱 분해", category: "화학" },
    { icon: Dna, text: "식물 성장 실험", category: "생물" },
    { icon: Globe, text: "태양전지 효율", category: "물리" },
    { icon: BarChart3, text: "다이오드 논리회로", category: "전자" }
  ];

  const researchStages = {
    exploration: { label: "주제 탐색", color: "bg-blue-100 text-blue-800" },
    planning: { label: "연구 설계", color: "bg-yellow-100 text-yellow-800" },
    execution: { label: "실험 진행", color: "bg-orange-100 text-orange-800" },
    writing: { label: "논문 작성", color: "bg-green-100 text-green-800" }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 좌측 사이드바 - 연구도구 */}
      <div className="w-56 bg-white border-r border-gray-200 shadow-sm flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <TestTube className="w-5 h-5 mr-2 text-blue-600" />
            연구도구
          </h2>
          <p className="text-sm text-gray-500 mt-1">대화가 깊어지면 활성화됩니다</p>
        </div>
        
        <div className="p-4 space-y-3">
          {/* 연구계획 구체화 버튼 */}
          <button
            onClick={triggerResearchPlan}
            disabled={!planningButtonEnabled || isLoading || calculateUsage() >= 100 || documentMode === 'research-plan'}
            className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
              planningButtonEnabled && documentMode !== 'research-plan' && calculateUsage() < 100
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md transform hover:scale-105' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" />
              <div>
                <div className="font-medium">🔬 연구계획</div>
                <div className="text-xs opacity-80">구체화하기</div>
              </div>
            </div>
            {planningButtonEnabled && documentMode !== 'research-plan' && calculateUsage() < 100 && (
              <div className="text-xs mt-2 opacity-90">
                💡 실험 설계를 도와드려요!
              </div>
            )}
          </button>

          {/* 가상 실험보고서 버튼 */}
          <button
            onClick={triggerExperimentReport}
            disabled={!reportButtonEnabled || isLoading || calculateUsage() >= 100 || documentMode === 'experiment-report'}
            className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
              reportButtonEnabled && documentMode !== 'experiment-report' && calculateUsage() < 100
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md transform hover:scale-105' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-5 h-5" />
              <div>
                <div className="font-medium">📝 실험보고서</div>
                <div className="text-xs opacity-80">가상 작성</div>
              </div>
            </div>
            {reportButtonEnabled && documentMode !== 'experiment-report' && calculateUsage() < 100 && (
              <div className="text-xs mt-2 opacity-90">
                📊 논문 형태로 정리해드려요!
              </div>
            )}
          </button>

          {/* 대회 출품작 조회 버튼 */}
          <button
            onClick={triggerCompetitionSearch}
            disabled={isLoading || calculateUsage() >= 100}
            className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
              !isLoading && calculateUsage() < 100
                ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md transform hover:scale-105' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FlaskConical className="w-5 h-5" />
              <div>
                <div className="font-medium">🏆 대회 출품작</div>
                <div className="text-xs opacity-80">조회 및 분석</div>
              </div>
            </div>
            {!isLoading && calculateUsage() < 100 && (
              <div className="text-xs mt-2 opacity-90">
                🔍 ISEF·국내대회 수상작 검색!
              </div>
            )}
          </button>

          {/* 다시 시작하기 버튼 */}
          <button
            onClick={resetAllData}
            disabled={isLoading}
            className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
              !isLoading
                ? 'bg-gray-500 hover:bg-gray-600 text-white shadow-md transform hover:scale-105' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 flex items-center justify-center">🔄</div>
              <div>
                <div className="font-medium">다시 시작하기</div>
                <div className="text-xs opacity-80">모든 대화 리셋</div>
              </div>
            </div>
          </button>
        </div>

        {/* 진행 상황 표시 */}
        {currentResearchTopic && (
          <div className="p-4 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">현재 연구주제</div>
            <div className="text-xs text-gray-600 mb-2">{currentResearchTopic}</div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${researchStages[researchStage].color}`}>
              {researchStages[researchStage].label}
            </span>
          </div>
        )}

        {/* 토큰 사용량 표시 */}
        <div className="p-4 border-t border-gray-100">
          <div className="text-sm text-gray-600 mb-2">토큰 사용량</div>
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded ${
                  i < Math.ceil(calculateUsage() / 20) ? getUsageColor().replace('bg-', 'bg-') : 'bg-gray-200'
                }`}
              ></div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {calculateUsage() < 20 ? '과학 주제로 대화해보세요' : 
             calculateUsage() < 60 ? '연구 주제가 명확해지고 있어요' : 
             calculateUsage() < 80 ? '깊이 있는 대화가 진행중이에요!' :
             '토큰 한계에 가까워지고 있어요'}
          </div>
          
          {/* 상세 토큰 사용량 표시 */}
          <div className="text-xs text-gray-400 mt-2 space-y-1">
            <div>사용량: {Math.round(getCurrentTokens()).toLocaleString()}/{maxTokens.toLocaleString()}</div>
            <div>API호출: {tokenUsage.apiCallCount}회</div>
          </div>
        </div>
      </div>

      {/* 중앙 채팅 영역 */}
      <div className={`flex flex-col transition-all duration-500 ${documentMode ? 'w-2/3' : 'flex-1'}`}>
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Beaker className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">과학연구설계 AI 튜터</h1>
              <p className="text-sm text-gray-500">함께 연구하는 과학 멘토</p>
            </div>
          </div>

          {/* 토큰 사용량 제한 바 */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>토큰 사용량</span>
              <span>{getCurrentTokens().toLocaleString()}/{maxTokens.toLocaleString()} ({Math.round(calculateUsage())}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getUsageColor()}`}
                style={{ width: `${calculateUsage()}%` }}
              ></div>
            </div>
            {calculateUsage() > 80 && (
              <div className="flex items-center mt-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                <span>토큰 한계에 가까워지고 있어요!</span>
              </div>
            )}
          </div>
        </div>

        {/* 빠른 주제 버튼 */}
        {messages.length <= 2 && !documentMode && (
          <div className="p-4 bg-white border-b border-gray-100">
            <p className="text-sm text-gray-600 mb-3">관심 있는 분야를 클릭해보세요:</p>
            <div className="flex flex-wrap gap-2">
              {quickTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(topic.text + " 실험해보고 싶어!")}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  <topic.icon className="w-4 h-4" />
                  <span>{topic.text}</span>
                  <span className="text-xs text-gray-500">({topic.category})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-2">
                    {message.content.includes('연구계획서를 생성하고 있습니다') || 
                     message.content.includes('실험보고서를 생성하고 있습니다') ? (
                      <>
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-600">과학튜터보조</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">과학 튜터</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.role === 'assistant' && index === typingMessageIndex && !message.isComplete 
                    ? displayedText 
                    : message.content}
                  {message.role === 'assistant' && index === typingMessageIndex && !message.isComplete && (
                    <span className="animate-pulse">|</span>
                  )}
                </div>
                
                <div className="mt-2 text-xs opacity-70">
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">생각하는 중...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="뭐든 궁금한 거 편하게 물어봐! (Shift+Enter로 줄바꿈)"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="2"
                disabled={isLoading || calculateUsage() >= 100}
              />
              
              {calculateUsage() >= 100 && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-90 rounded-lg flex items-center justify-center">
                  <p className="text-sm text-gray-600">토큰 한계에 도달했습니다</p>
                </div>
              )}
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading || calculateUsage() >= 100}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
            <span>💡 팁: 어떤 과학 주제든 AI가 자동 분석! 부적절한 주제는 필터링됩니다</span>
            <div className="flex items-center space-x-1">
              <Lightbulb className="w-3 h-3" />
              <span>범용 AI 분석 시스템</span>
            </div>
          </div>
        </div>
      </div>

      {/* 우측 문서 생성 영역 */}
      {documentMode && (
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col min-h-0">
          {/* 문서 헤더 */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {documentMode === 'research-plan' ? (
                  <FileText className="w-4 h-4 text-blue-600" />
                ) : (
                  <BarChart3 className="w-4 h-4 text-green-600" />
                )}
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {documentMode === 'research-plan' ? '연구계획서' : '실험보고서'}
                  </h3>
                  <p className="text-xs text-gray-500">AI 실시간 문서 생성</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {!isDocumentGenerating && documentContent && (
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    title="PDF 다운로드"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setDocumentMode(null);
                    setIsDocumentGenerating(false);
                    setDocumentContent('');
                    setDocumentProgress(0);
                    setDocumentProgressMessage('');
                  }}
                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  title="문서 닫기"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 문서 내용 */}
          <div className="flex-1 overflow-y-auto bg-white" style={{ minHeight: 0 }}>
            {isDocumentGenerating ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  {/* 원형 진행률 표시 */}
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - documentProgress / 100)}`}
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{documentProgress}%</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 font-medium mb-2 text-sm">{documentProgressMessage}</p>
                  <p className="text-xs text-gray-500">과학연구설계AI가 전문적인 문서를 작성하고 있습니다</p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${documentProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : documentContent ? (
              <div className="p-4">
                <div 
                  className="text-sm leading-relaxed"
                  style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.5',
                    maxWidth: '100%',
                    wordWrap: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ __html: documentContent }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
