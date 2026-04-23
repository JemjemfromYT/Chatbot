import dotenv from "dotenv";
dotenv.config();
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const API_KEY = process.env.API_KEY;

// THE 2026 FREE MODEL SQUAD (Moving your list here)
const MODELS = [
  "gemini-2.5-flash", 
  "gemini-2.5-flash-lite", 
  "gemini-3.1-flash-lite-preview"
];

app.post("/ask", async (req, res) => {
  let lastError = null;

  // Your Triple-Backup Logic
  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        }
      );

      const data = await response.json();

      // If the model is busy (429) or broken (500/503), try the next one
      if (data.error) {
        if (data.error.code === 429 || data.error.code === 503) {
          console.log(`Model ${model} exhausted, trying next...`);
          lastError = data.error.message;
          continue; 
        }
        return res.status(data.error.code || 500).json(data);
      }

      // If we got a real answer, send it back and STOP the loop
      return res.json(data);

    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  // If we get here, all models failed
  res.status(429).json({ error: `All models exhausted. Last error: ${lastError}` });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));