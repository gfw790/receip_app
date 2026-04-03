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

  // 총액
  let totalAmount = "";
  const totalKeywords = ["청구액","총합계","결제액"];

  for (let i = 0; i < lines.length; i++) {
    if (totalKeywords.some(k => lines[i].includes(k))) {
      const next = lines[i+1] || "";
      const num = next.replace(/,/g,"").match(/\d+/);
      if (num) {
        totalAmount = num[0];
        break;
      }
    }
  }

  // 품목
  const items = lines.filter(l => {
    if (l.includes("#")) return true;
    return false;
  }).map(l => l.replace("#","").trim());

  res.status(200).json({
    storeName,
    date,
    totalAmount,
    items,
    raw: text
  });
}
