/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Make sure body size limit is high enough for pictures (e.g. 10mb)
  app.use(express.json({ limit: "10mb" }));

  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // API Route: Check if Gemini is available
  app.get("/api/config", (req, res) => {
    res.json({
      hasGeminiKey: !!apiKey,
    });
  });

  // API Route: OCR and Parse using Gemini
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Falta la imagen para el procesamiento." });
      }

      if (!ai) {
        return res.status(503).json({ 
          error: "Clave de API de Gemini no está configurada o es inválida en este entorno." 
        });
      }

      // Extract the mime type and raw base64 data
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Formato de imagen inválido. Debe ser una URL de datos base64." });
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      };

      const promptPart = {
        text: "Analyze the Siemens ID / nameplate / brand label. Perform extremely high-precision OCR to transcribe all text exactly as it appears. Also, parse the fields into the provided responseSchema. Pay exceptional attention to the MLFB (catalog number/order number), usually formatted like 1LE1001-1DB43-4AF4-Z, 1LA7083-4AA10, 6SL3720-1TG34-1AA3-Z, 6ES7315-2AH14-0AB0 etc. Fix typical OCR confusions such as letter 'O' instead of digit '0' or 'I/L' instead of '1' inside numeric/alphanumeric slots of the MLFB code. Identify all Z-Codes (Siemens custom options, such as A11, K20, L22, G11, etc.) that are present in the text and place them in the 'zCodes' array. Do not hallucinate fields that cannot be read.",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rawText: { 
                type: Type.STRING, 
                description: "Full transcription list of all visible lines on the plate to show the user." 
              },
              mlfb: { 
                type: Type.STRING, 
                description: "The extracted and normalized Siemens MLFB code, e.g. 1LE1001-1DB43-4AF4-Z" 
              },
              zCodes: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of extracted option Z-codes (like A11, L22)." 
              },
              serial: { 
                type: Type.STRING, 
                description: "The serial or fabrication number." 
              },
              fdDate: { 
                type: Type.STRING, 
                description: "FD date string represented in clear form (e.g. 'Ene 2015')." 
              },
              voltage: { type: Type.STRING, description: "e.g. '230/400 V'" },
              current: { type: Type.STRING, description: "e.g. '11.4/6.6 A'" },
              power: { type: Type.STRING, description: "e.g. '4.0 kW'" },
              speed: { type: Type.STRING, description: "e.g. '1450 RPM'" },
              frequency: { type: Type.STRING, description: "e.g. '50 Hz'" },
              cosPhi: { type: Type.STRING, description: "e.g. '0.82'" },
              ipRating: { type: Type.STRING, description: "e.g. 'IP55'" },
              weight: { type: Type.STRING, description: "e.g. '45 kg'" },
              efficiency: { type: Type.STRING, description: "e.g. 'IE3 (88.5%)'" },
              modelType: { 
                type: Type.STRING, 
                description: "motor | vfd | plc | switchgear | other" 
              }
            },
            required: ["rawText", "mlfb"]
          }
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No se obtuvo respuesta del motor de Inteligencia Artificial.");
      }

      const parsedJson = JSON.parse(resultText);
      res.json(parsedJson);
    } catch (err: any) {
      console.error("Gemini server-side OCR error:", err);
      res.status(500).json({ error: err.message || "Error al procesar la imagen de la placa con IA." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on status port ${PORT}`);
  });
}

startServer();
