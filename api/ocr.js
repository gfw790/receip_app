export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(.*)$/);
  return match ? match[1] : null;
}

function extractFileBuffer(bodyBuffer, boundary) {
  const bodyText = bodyBuffer.toString("binary");
  const parts = bodyText.split(`--${boundary}`);

  for (const part of parts) {
    if (
      part.includes('name="file"') &&
      part.includes("Content-Type:")
    ) {
      const splitIndex = part.indexOf("\r\n\r\n");
      if (splitIndex === -1) continue;

      const fileBinary = part.substring(splitIndex + 4, part.lastIndexOf("\r\n"));
      return Buffer.from(fileBinary, "binary");
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "환경변수 GOOGLE_VISION_API_KEY가 없습니다."
      });
    }

    const contentType = req.headers["content-type"] || "";
    const boundary = getBoundary(contentType);

    if (!boundary) {
      return res.status(400).json({ error: "multipart/form-data 형식이 아닙니다." });
    }

    const bodyBuffer = await readRequestBody(req);
    const fileBuffer = extractFileBuffer(bodyBuffer, boundary);

    if (!fileBuffer) {
      return res.status(400).json({ error: "업로드된 파일을 찾을 수 없습니다." });
    }

    const base64Image = fileBuffer.toString("base64");

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                {
                  type: "TEXT_DETECTION"
                }
              ]
            }
          ]
        })
      }
    );

    const visionData = await visionResponse.json();

    if (!visionResponse.ok) {
      return res.status(visionResponse.status).json({
        error: "Vision API 호출 실패",
        detail: visionData
      });
    }

    const text =
      visionData?.responses?.[0]?.fullTextAnnotation?.text || "";

    return res.status(200).json({
      success: true,
      text
    });
  } catch (error) {
    return res.status(500).json({
      error: "서버 처리 중 오류",
      detail: error.message
    });
  }
}
