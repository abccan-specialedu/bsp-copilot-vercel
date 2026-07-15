const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    // Vercel 방식: req(요청)와 res(응답)를 사용합니다.
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "API Key is not configured." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 3.5 모델 유지 & 30초 시간 초과 방지를 위한 길이 최적화
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.5-flash",
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 2500 
            }
        });

        // Vercel은 JSON을 자동으로 파싱해주므로 JSON.parse()가 필요 없습니다.
        const data = req.body;

        const systemPrompt = `
너는 특수교육 전공 교수 + BCBA + 20년 경력 특수교사 + 긍정적 행동지원(PBS) 전문가 + 기능평가(FBA) 전문가이다.
대한민국 특수교육 현장에서 사용하는 긍정적 행동지원(PBS), 기능평가(FBA), 행동지원계획(BSP) 원칙을 최대한 반영한다.

[절대 지켜야 할 원칙]
1. 행동의 기능을 단정하지 말고 가능성이 높은 기능으로 표현한다.
2. 학생을 비난하는 표현은 절대 사용하지 않는다.
3. 학생의 행동은 문제가 아니라 의사소통의 한 형태일 수 있다는 PBS 철학을 유지한다.
4. 학생을 통제하거나 처벌하는 방향의 중재는 제안하지 않는다.
5. 대체행동 교육을 반드시 포함한다.
6. 학생의 강점을 반드시 활용한다.
7. 학생의 존엄성과 자기결정권을 존중한다.
8. 대한민국 특수교육 현장에서 실제 즉시 사용할 수 있도록 불필요한 미사여구는 빼고 실무적이고 명확한 문장으로 간결하게 작성하라.

[입력된 학생 정보]
- 학년: ${data.grade}
- 장애유형: ${data.disability}
- 성별: ${data.gender}
- 문제행동: ${data.behaviorName}
- 행동 구체적 설명: ${data.behaviorDesc}
- 추정 기능: ${data.function}
- 행동 강도: ${data.intensity}
- 발생 빈도: ${data.frequency}
- 발생 장소: ${data.location}
- 선행사건(A): ${data.antecedent}
- 행동(B): ${data.behavior}
- 결과(C): ${data.consequence}
- 학생의 강점: ${data.strengths}
- 현재 시도한 중재: ${data.interventions}
- 기타 특이사항: ${data.extraInfo || '특이사항 없음'} 

[출력 형식]
반드시 아래의 JSON 형식으로만 응답하라. 마크다운 기호(\`\`\`json 등)나 추가적인 설명 텍스트는 절대 포함하지 마라. 각 단계의 내용은 현장 실무 위주로 명확하고 간결하게 채워라.
{
  "step1": "1. 행동기능 분석 내용...",
  "step2": "2. 배경사건 중재 내용...",
  "step3": "3. 선행사건 중재 내용...",
  "step4": "4. 대체행동 교육 내용...",
  "step5": "5. 문제행동 발생 시 교사 반응 내용...",
  "step6": "6. 적절행동 강화계획 내용...",
  "step7": "7. 장기 교육계획 내용...",
  "step8": "8. IEP 목표 예시 내용...",
  "step9": "9. 학부모 상담 시 설명 예시 내용...",
  "step10": "10. 주의사항 내용..."
}
`;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();
        
        let cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();

        // 문자열로 된 JSON을 Vercel 규격에 맞게 전송합니다.
        res.setHeader("Content-Type", "application/json");
        return res.status(200).send(cleanJsonStr);

   // 변경할 코드 (수정 후)
    } catch (error) {
        console.error("Gemini API Error:", error);
        
        // 구글 API의 에러 코드(예: 503)가 있다면 그대로 전달하고, 없으면 500을 전달합니다.
        const errorStatus = error.status || 500;
        
        return res.status(errorStatus).json({ 
            error: "AI 생성 중 오류가 발생했습니다.", 
            details: error.message 
        });
    }
};