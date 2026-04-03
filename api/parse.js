export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { text } = req.body;

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l);

  // 매장명 찾기 (롯데리아 같은 키워드 우선)
  let storeName = "";

  for (const l of lines) {
    if (l.includes("롯데리아") || l.includes("점")) {
      storeName = l.replace("(주)", "").trim();
      break;
    }
  }

  if (!storeName) storeName = lines[0];

  // 날짜
  let date = "";
  const dateRegex = /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/;

  for (const l of lines) {
    const m = l.match(dateRegex);
    if (m) {
      date = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
      break;
    }
  }

// 총액 찾기 (개선)
let totalAmount = "";
const totalKeywords = ["청구액","총합계","결제액"];

for (let i = 0; i < lines.length; i++) {
  if (totalKeywords.some(k => lines[i].includes(k))) {

    // 다음 3줄 안에서 숫자 찾기
    for (let j = 1; j <= 3; j++) {
      const next = lines[i + j] || "";
      const num = next.replace(/,/g,"").match(/\d{3,}/);

      if (num) {
        totalAmount = num[0];
        break;
      }
    }

    if (totalAmount) break;
  }
}

// 품목 (개선)
const items = lines
  .filter(l => {
    if (!l.startsWith("#")) return false;

    // 옵션 제거 (#- 로 시작하면 제외)
    if (l.startsWith("#-")) return false;

    return true;
  })
  .map(l => l.replace("#","").trim());
