// api/generate.js  —  Vercel 서버리스 함수
// API 키는 이 서버에서만 읽습니다(브라우저에 노출되지 않음).
// Vercel 프로젝트 설정 > Environment Variables 에 ANTHROPIC_API_KEY 를 등록하세요.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }
  

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "서버에 API 키가 없습니다. Vercel 환경변수 ANTHROPIC_API_KEY를 등록한 뒤 다시 배포하세요." });
    return;
  }

  try {
    // Vercel은 보통 req.body를 자동 파싱하지만, 안전하게 둘 다 처리
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const notes = (body && body.notes) || "";
    const count = Math.min(Math.max(parseInt((body && body.count) || 6, 10) || 6, 3), 12);
    const asked = (body && body.asked) || [];

    if (!notes || notes.trim().length < 20) {
      res.status(400).json({ error: "노트 내용이 너무 짧습니다." });
      return;
    }

    const askedList = (asked || []).slice(0, 40).map(q => "- " + q).join("\n");
    const prompt =
`당신은 한국 방송통신대학교 시험 출제위원입니다. 아래 [학습 노트]를 바탕으로 한국어 4지선다 객관식 문제 ${count}개를 만드세요.
규칙:
- 노트의 핵심 개념, 순서, 정의, 함정 포인트를 골고루 출제
- 각 문제는 보기 4개, 정답은 정확히 1개
- "~아닌 것은?", "순서로 옳은 것은?", "매칭" 같은 변형·함정 문제를 섞을 것
- 각 문제에 한 줄짜리 간단한 해설(e)을 포함
- 반드시 아래 JSON 배열만 출력하세요. 코드펜스(\`\`\`)나 다른 설명은 절대 쓰지 마세요.
출력 형식 예시:
[{"q":"문제 내용","o":[["보기A",false],["정답 보기",true],["보기C",false],["보기D",false]],"e":"한 줄 해설"}]
${askedList ? ("\n[이미 출제한 문제 — 절대 중복 금지]\n" + askedList + "\n") : ""}
[학습 노트]
${notes.slice(0, 8000)}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        // 기본: 가장 저렴·빠른 모델. 더 똑똑하게 하려면 "claude-sonnet-4-6" 로 변경.
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      res.status(502).json({ error: "Claude API 오류 (" + r.status + "). 키/결제 설정을 확인하세요.", detail: t.slice(0, 300) });
      return;
    }

    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    const questions = parseQuestions(text);
    if (!questions.length) {
      res.status(422).json({ error: "문제를 해석하지 못했어요. 다시 시도해 주세요." });
      return;
    }
    res.status(200).json({ questions });
  } catch (e) {
    res.status(500).json({ error: e.message || "알 수 없는 오류가 발생했습니다." });
  }
};

function parseQuestions(raw) {
  let t = (raw || "").trim().replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("[");
  if (s > 0) t = t.slice(s);
  let arr = null;
  try { arr = JSON.parse(t); }
  catch (e) {
    const last = t.lastIndexOf("}");
    if (last > 0) { try { arr = JSON.parse(t.slice(0, last + 1) + "]"); } catch (e2) { arr = null; } }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(it => it && typeof it.q === "string" && Array.isArray(it.o) && it.o.length >= 2 &&
      it.o.filter(o => Array.isArray(o) && o[1] === true).length === 1)
    .map(it => ({ q: it.q, e: it.e || "", o: it.o.slice(0, 4).map(o => [String(o[0]), !!o[1]]) }));
}
