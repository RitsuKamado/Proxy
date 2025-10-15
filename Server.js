import express from "express";
import cors from "cors";
import axios from "axios";
import { Readable } from "stream";

const app = express();
app.use(cors());

// Unified endpoint
app.get("/", async (req, res) => {
  const target = req.query.url;
  const headersParam = req.query.headers;
  if (!target) return res.status(400).send("Missing ?url=");

  let customHeaders = {};
  if (headersParam) {
    try {
      customHeaders = JSON.parse(headersParam);
    } catch {
      return res.status(400).send("Invalid headers JSON");
    }
  }

  try {
    const range = req.headers.range;
    const decodedUrl = decodeURIComponent(target);

    // Prefer axios for video/streaming
    const response = await axios.get(decodedUrl, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        "Referer": "https://vidrock.net/",
        ...(range ? { Range: range } : {}),
        ...customHeaders,
      },
    });

    Object.entries(response.headers).forEach(([key, value]) =>
      res.setHeader(key, value)
    );

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Range");

    res.status(response.status);
    req.on("close", () => response.data.destroy?.());
    response.data.pipe(res);
  } catch (err) {
    console.warn("Axios failed, falling back to fetch:", err.message);
    try {
      const proxied = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          ...customHeaders,
        },
      });

      // Convert Web Stream → Node Stream
      const nodeStream = Readable.fromWeb(proxied.body);

      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type,Range");

      nodeStream.pipe(res);
    } catch (e) {
      res.status(500).send("Error fetching: " + e.message);
    }
  }
});

app.listen(3000, () =>
  console.log("✅ Proxy running on http://localhost:3000")
);
