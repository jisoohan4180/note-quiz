// server.js — 로컬 개발 서버 (추가 설치 불필요, Node 18+ 필요)
// 실행:  node server.js   →   브라우저에서 http://localhost:3000 열기
// API 키는 같은 폴더의 .env.local 파일에서 읽습니다.

const http = require("http");
const fs = require("fs");
const path = require("path");

// --- .env.local 파일에서 환경변수 불러오기 (의존성 없음) ---
try {
  const txt = fs.readFileSync(path.join(__dirname, ".env.local"), "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
} catch (e) { /* .env.local 없으면 그냥 넘어감 */ }

// Vercel 서버리스 함수(api/generate.js)를 그대로 재사용
const handler = require("./api/generate.js");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // --- API 라우트 ---
  if (req.url.split("?")[0] === "/api/generate" && req.method === "POST") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = {}; }
      // Vercel 스타일 res.status().json() 헬퍼 추가
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (obj) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(obj));
      };
      try {
        await handler(req, res);
      } catch (e) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: e.message || "서버 오류" }));
      }
    });
    return;
  }

  // --- 정적 파일(index.html 등) ---
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(__dirname, urlPath);
  if (!filePath.startsWith(__dirname)) { res.statusCode = 403; return res.end("Forbidden"); }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; res.end("Not found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    };
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("\n  ✅ 로컬 서버 실행 중!");
  console.log("  👉 브라우저에서 열기:  http://localhost:" + PORT + "\n");
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("여기에")) {
    console.log("  ⚠️  ANTHROPIC_API_KEY가 아직 설정 안 됐어요.");
    console.log("      .env.local 파일을 열어 sk-ant-... 키를 넣고 서버를 다시 실행하세요.\n");
  }
});
