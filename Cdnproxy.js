import express from "express";
import fetch from "node-fetch";
const app = express();

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
    const proxied = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ...customHeaders,
      },
    });

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    proxied.body.pipe(res);
  } catch (e) {
    res.status(500).send("Error fetching: " + e.message);
  }
});

app.listen(3000, () => console.log("Proxy running on port 3000"));
