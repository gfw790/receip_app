export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { text } = req.body;

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l);

  // 매장명 (첫 줄)
  const storeName = lines[0] || "";

  // 날짜 찾기
  let date = "";
  const dateRegex = /(\d{4})[./-]\s?(\d{1,2})[./-]\s?(\d{1,2})/;

  for (const l of lines) {
    const m = l.match(dateRegex);
    if (m) {
      date = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
      break;
    }
  }

  // 총액 찾기
  let totalAmount = "";
  const keywords = ["합계","총액","결제","금액"];

  for (const l of lines) {
    if (keywords.some(k => l.includes(k))) {
      const nums = l.replace(/,/g,"").match(/\d+/g);
      if (nums) totalAmount = nums.pop();
    }
  }

  // 품목 후보
  const items = lines.filter(l => {
    if (l === storeName) return false;
    if (l.includes(date)) return false;
    if (keywords.some(k => l.includes(k))) return false;
    return /\d/.test(l);
  });

  res.status(200).json({
    storeName,
    date,
    totalAmount,
    items,
    raw: text
  });
}
