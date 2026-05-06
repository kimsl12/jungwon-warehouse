import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const candidates = [
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
  ];
  for (const model of candidates) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Draw a simple electrical schematic of a single-phase 2-wire circuit with one switch and one lamp. White background.",
              },
            ],
          },
        ],
        config: { responseModalities: ["IMAGE", "TEXT"] },
      });
      const parts = res.candidates?.[0]?.content?.parts ?? [];
      const imgParts = parts.filter(
        (p) => (p as { inlineData?: unknown }).inlineData,
      );
      const textParts = parts.filter(
        (p) => typeof (p as { text?: unknown }).text === "string",
      );
      console.log(
        `OK ${model}: images=${imgParts.length} text=${textParts.length}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`---FAIL ${model}---`);
      console.log(msg);
      console.log("---");
    }
  }
}
main();
