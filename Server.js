import express from "express";
import cors from "cors";
import axios from "axios";
import { Readable } from "stream";

const app = express();
app.use(cors());

app.get("/", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing ?url=");

  try {
    const decodedUrl = decodeURIComponent(target);
    const range = req.headers.range;

    const response = await axios.get(decodedUrl, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Referer": "https://vidrock.net/",
        "Origin": "https://vidrock.net",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        ...(range ? { Range: range } : {}),
      },
      validateStatus: (status) => status < 500, // don't throw on 4xx
    });

    res.status(response.status);
    for (const [key, value] of Object.entries(response.headers)) {
      if (!["transfer-encoding", "content-encoding"].includes(key))
        res.setHeader(key, value);
    }

    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Range",
    });

    response.data.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(3000, () =>
  console.log("✅ Proxy running on http://localhost:3000")
);
