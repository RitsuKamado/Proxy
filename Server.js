import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());

app.get("/", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing ?url=");

  try {
    const decodedUrl = decodeURIComponent(target);
    const range = req.headers.range;

    // If the URL ends with .m3u8, fetch and rewrite it
    if (decodedUrl.endsWith(".m3u8")) {
      const response = await axios.get(decodedUrl, {
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          Referer: "https://vidrock.net/",
          Origin: "https://vidrock.net",
          Accept: "*/*",
        },
      });

      const base = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);
      const rewritten = response.data.replace(
        /^(?!#)([^#\s]+\.ts)/gm,
        `${req.protocol}://${req.get("host")}/?url=${encodeURIComponent(base)}$1`
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(rewritten);
      return;
    }

    // Otherwise stream the TS or other media file
    const response = await axios.get(decodedUrl, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        Referer: "https://vidrock.net/",
        Origin: "https://vidrock.net",
        Accept: "*/*",
        "Accept-Encoding": "identity",
        ...(range ? { Range: range } : {}),
      },
      validateStatus: (s) => s < 500,
    });

    // Preserve streaming headers
    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "last-modified",
      "etag",
    ];
    for (const [key, value] of Object.entries(response.headers)) {
      if (passthroughHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    res.status(response.status);
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Range",
    });

    // Stream the segment directly
    response.data.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(3000, () => {
  console.log("✅ Proxy running on http://localhost:3000");
});
