document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bspForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const copyBtn = document.getElementById('copyBtn');
    const printBtn = document.getElementById('printBtn');

    const loadingTexts = [
        "학생 정보를 꼼꼼히 분석하고 있습니다...",
        "긍정적 행동지원(PBS) 원칙을 적용 중입니다...",
        "학생의 강점을 기반으로 중재안을 구성하고 있습니다...",
        "행동지원계획(BSP) 초안을 작성하는 중입니다...",
        "거의 다 되었습니다..."
    ];

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        

// 통신 실패(503) 시 3초 대기 후 딱 1번 더 재시도하는 함수
async function fetchWithRetry(url, options, retries = 1) {
    let response = await fetch(url, options);

    // 구글 서버 과부하(503) 에러이고, 재시도 기회가 남아있다면
    if (response.status === 503 && retries > 0) {
        console.log("서버 과부하 발생! 3초 후 다시 시도합니다...");
        
        // 3초(3000ms) 동안 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 다시 서버에 요청
        response = await fetch(url, options);
    }
    
    return response;
}


        // 1. 폼 데이터 수집
        const formData = new FormData(form);
        const locations = formData.getAll('location');
        const data = Object.fromEntries(formData.entries());
        data.location = locations.length > 0 ? locations.join(', ') : '선택 안 함';

        // 2. 로딩 화면 표시 및 텍스트 롤링
        loadingOverlay.classList.remove('hidden');
        resultSection.classList.add('hidden');
        
        let textIndex = 0;
        loadingMessage.textContent = loadingTexts[textIndex];
        const loadingInterval = setInterval(() => {
            textIndex = (textIndex + 1) % loadingTexts.length;
            loadingMessage.textContent = loadingTexts[textIndex];
        }, 3000);

        try {
            // 3. Netlify Function (Gemini API) 호출
            const response = await fetchWithRetry('/api/generateBsp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

if (!response.ok) {
    if (response.status === 503) {
        // 재시도까지 했는데도 503이면 친절한 메시지를 던집니다.
        throw new Error("현재 AI 서버 이용자가 많습니다. 잠시 후 다시 시도해주세요.");
    } else {
        // 그 외의 다른 에러일 경우
        throw new Error("행동지원계획 생성 중 오류가 발생했습니다."); 
    }
}
            const resultJson = await response.json();
            
            // 4. 결과 렌더링
            renderAccordion(resultJson);
            
            // 5. 결과 화면 표시 (폼 숨기지 않고 하단에 표시)
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            alert('행동지원계획 생성 중 오류가 발생했습니다. 다시 시도해 주세요.\n에러 내용: ' + error.message);
        } finally {
            clearInterval(loadingInterval);
            loadingOverlay.classList.add('hidden');
        }
    });

    // 아코디언 UI 생성 함수
    function renderAccordion(data) {
        resultContent.innerHTML = ''; // 초기화

        const sections = [
            { id: "step1", title: "1. 행동기능 분석" },
            { id: "step2", title: "2. 배경사건 중재" },
            { id: "step3", title: "3. 선행사건 중재" },
            { id: "step4", title: "4. 대체행동 교육" },
            { id: "step5", title: "5. 문제행동 발생 시 교사 반응" },
            { id: "step6", title: "6. 적절행동 강화계획" },
            { id: "step7", title: "7. 장기 교육계획" },
            { id: "step8", title: "8. IEP 목표 예시" },
            { id: "step9", title: "9. 학부모 상담 시 설명 예시" },
            { id: "step10", title: "10. 주의사항" }
        ];

        sections.forEach((sec, index) => {
            const details = document.createElement('details');
            if(index === 0) details.open = true; // 첫 번째 탭은 기본적으로 열어둠

            const summary = document.createElement('summary');
            summary.textContent = sec.title;

            const contentDiv = document.createElement('div');
            // AI가 반환한 데이터를 텍스트로 안전하게 삽입
            contentDiv.textContent = data[sec.id] || "내용을 생성하지 못했습니다.";

            details.appendChild(summary);
            details.appendChild(contentDiv);
            resultContent.appendChild(details);
        });
    }

    // 복사 버튼 기능
    copyBtn.addEventListener('click', () => {
        const detailsObj = document.querySelectorAll('details');
        let textToCopy = "=== 행동지원계획(BSP) ===\n\n";
        
        detailsObj.forEach(detail => {
            const title = detail.querySelector('summary').textContent;
            const content = detail.querySelector('div').textContent;
            textToCopy += `[${title}]\n${content}\n\n`;
        });

        navigator.clipboard.writeText(textToCopy).then(() => {
            alert('행동지원계획이 클립보드에 복사되었습니다.');
        }).catch(err => {
            alert('복사에 실패했습니다.');
        });
    });

    // 인쇄 / PDF 저장 버튼 기능
    printBtn.addEventListener('click', () => {
        // 인쇄 시 모든 아코디언을 열어줍니다.
        document.querySelectorAll('details').forEach(detail => {
            detail.setAttribute('open', 'true');
        });
        window.print();
    });
});