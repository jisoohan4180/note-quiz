# 📝 내 노트로 시험문제 만들기 — 배포 가이드

정리 노트를 붙여넣으면 Claude가 4지선다 문제를 자동으로 만들어 주는 웹사이트입니다.
이 폴더를 Vercel에 올리면 `https://내이름.vercel.app` 같은 **내 주소**로 누구나 접속해 쓸 수 있어요.

---

## 구조 (이해만 하고 넘어가도 됨)

- `index.html` — 화면(노트 입력 + 문제 풀이). 사용자가 보는 부분.
- `api/generate.js` — **서버**. 여기서만 API 키를 읽어 Claude를 호출합니다.
  → 키가 화면 코드에 들어가지 않으므로 **노출되지 않습니다.**
- `vercel.json`, `package.json` — 설정 파일.

---

## 0단계 · Anthropic API 키 발급 (필수)

1. https://console.anthropic.com 접속 → 가입/로그인
2. **Billing**에서 결제수단 등록 + 소액 충전(문제 생성 시 사용량만큼 과금됨)
3. **API Keys → Create Key** → 생성된 키(`sk-ant-...`) 복사
   - ⚠️ 키는 비밀번호와 같습니다. **누구에게도 공유하지 말고, 코드/깃허브에 직접 넣지 마세요.**
   - 안심 장치: 콘솔의 **Limits/Usage**에서 월 사용 한도를 걸어두면 과금 폭주를 막을 수 있어요.

> 비용: 기본 모델(Claude Haiku 4.5)은 매우 저렴해서 문제 한 묶음 생성에 보통 몇 원~수십 원 수준입니다.
> 정확한 단가는 https://www.anthropic.com/pricing 에서 확인하세요.

---

## 1단계 · GitHub에 코드 올리기 (GUI, 터미널 불필요)

1. https://github.com 가입/로그인 → **New repository** → 이름(예: `note-quiz`) → Create
2. 새 저장소 화면에서 **uploading an existing file** 클릭
3. 이 폴더 안의 파일들을 **그대로 드래그해서 업로드**
   (`index.html`, `api` 폴더, `vercel.json`, `package.json`, `.gitignore` 등)
4. **Commit changes** 클릭

---

## 2단계 · Vercel에 배포하기

1. https://vercel.com 접속 → **Continue with GitHub**로 로그인
2. **Add New… → Project** → 방금 만든 저장소(`note-quiz`) **Import**
3. 설정 화면에서 **Environment Variables** 펼치기 →
   - Name: `ANTHROPIC_API_KEY`
   - Value: 아까 복사한 키(`sk-ant-...`) 붙여넣기
   - **Add** 클릭
4. **Deploy** 클릭 → 1~2분 후 `https://...vercel.app` 주소 생성 🎉

이 주소를 휴대폰/PC 어디서나 열어 쓰면 됩니다.

> 환경변수를 나중에 바꾸거나 추가했다면 **Deployments → 점 세 개 → Redeploy**로 다시 배포해야 적용됩니다.

---

## (대안) 터미널로 빠르게 배포 — Vercel CLI

```bash
npm i -g vercel          # 1) CLI 설치
cd note-quiz-site        # 2) 이 폴더로 이동
vercel                   # 3) 로그인 후 배포 (질문은 엔터로 진행)
vercel env add ANTHROPIC_API_KEY   # 4) 키 등록 (붙여넣기)
vercel --prod            # 5) 실제 주소로 배포
```

---

## 커스터마이즈

`api/generate.js` 안에서 한 줄만 바꾸면 됩니다.

- **더 똑똑한 문제로:** `model: "claude-haiku-4-5-20251001"` → `model: "claude-sonnet-4-6"`
  (품질↑, 비용도 조금↑)
- **출제 스타일/난이도:** 같은 파일의 `prompt` 문구를 원하는 대로 수정
- **한 번에 만드는 문항 수:** 화면에서 선택(최대 10), 서버 상한은 12

---

## 자주 막히는 부분

- **"서버에 API 키가 없습니다"** → Vercel 환경변수 `ANTHROPIC_API_KEY` 미등록 또는 등록 후 Redeploy 안 함.
- **"Claude API 오류 (401/403)"** → 키가 틀렸거나 결제수단 미등록.
- **"Claude API 오류 (429)"** → 사용 한도 초과. 콘솔에서 한도/잔액 확인.
- **문제가 안 만들어짐** → 노트를 조금 더 길게 붙여넣고 다시 시도.

---

본 프로젝트는 개인 학습용입니다. API 키와 사용량은 본인이 관리하세요.
