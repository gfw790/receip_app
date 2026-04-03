export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { text } = req.body;

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l);

  // 1. 매장명 찾기
  let storeName = "";

  for (const l of lines) {
    if (
      l.includes("롯데리아") ||
      l.includes("이마트") ||
      l.includes("홈플러스") ||
      l.includes("스타벅스") ||
      l.includes("점")
    ) {
      if (
        !l.includes("선택주문") &&
        !l.includes("흠서비스") &&
        !l.includes("배달의민족")
      ) {
        storeName = l.replace("(주)", "").trim();
        break;
      }
    }
  }

  if (!storeName) {
    storeName = "";
  }

  // 2. 날짜 찾기
  let date = "";
  const dateRegex = /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/;

  for (const l of lines) {
    const m = l.match(dateRegex);
    if (m) {
      date = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      break;
    }
  }

  // 3. 총액 찾기
  let totalAmount = "";
  const totalKeywords = ["청구액", "총합계", "총합 계", "결제금액"];

  for (let i = 0; i < lines.length; i++) {
    if (totalKeywords.some(k => lines[i].includes(k))) {
      for (let j = 1; j <= 5; j++) {
        const next = lines[i + j] || "";
        const num = next.replace(/,/g, "").match(/\d{3,}/);

        if (num) {
          totalAmount = num[0];
          break;
        }
      }
      if (totalAmount) break;
    }
  }

  // 4. 품목 구간 찾기
  let itemStart = -1;
  let itemEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("제품명")) {
      itemStart = i;
      break;
    }
  }

  for (let i = itemStart + 1; i < lines.length; i++) {
    if (
      lines[i].includes("총합계") ||
      lines[i].includes("총합 계") ||
      lines[i].includes("청구액") ||
      lines[i].includes("결제금액")
    ) {
      itemEnd = i;
      break;
    }
  }

  let itemSection = [];
  if (itemStart !== -1 && itemEnd !== -1 && itemEnd > itemStart) {
    itemSection = lines.slice(itemStart + 1, itemEnd);
  }

  // 5. 품목 정리
  const items = itemSection
    .filter(l => l.startsWith("#"))
    .filter(l => !l.startsWith("#-")) // 옵션 제외
    .map(l => l.replace(/^#/, "").trim());

  return res.status(200).json({
    storeName,
    date,
    totalAmount,
    items,
    raw: text
  });
}
