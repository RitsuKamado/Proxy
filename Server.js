const express = require('express');
const cors = require('cors');
const axios = require('axios');


const app = express();
app.use(cors());

app.get("/proxy", async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    try {
        if (!targetUrl.includes("proxy.vidrock.store/")) {
            targetUrl = decodeURIComponent(targetUrl);
        }

        // Forward Range header if present
        const range = req.headers.range;

        const response = await axios.get(targetUrl, {
            responseType: "stream", // Stream for large video files
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
                "Referer": "https://vidrock.net/",
                ...(range ? { Range: range } : {})
            }
        });

        // Pass through important headers for video streaming
        Object.keys(response.headers).forEach(header => {
            res.setHeader(header, response.headers[header]);
        });

        res.status(response.status);
                // When client closes connection, destroy the axios stream to avoid leaks
        req.on('close', () => {
            if (response.data.destroy) {
                response.data.destroy();
            }
        });
        response.data.pipe(res);

    } catch (err) {
        console.error("Proxy error:", err.message);
        if (err.response) {
            res.status(err.response.status).send("Error fetching video");
        } else {
            res.status(500).send("Internal server error");
        }
    }
});

app.listen(3001, () => {
  console.log('✅ Server running at http://localhost:3001');
});