import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const models = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: "1+1=?",
      });
      console.log(
        `OK ${model}: text="${res.text?.trim().slice(0, 30)}" | in=${res.usageMetadata?.promptTokenCount} out=${res.usageMetadata?.candidatesTokenCount}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL ${model}: ${msg.slice(0, 120)}`);
    }
  }
}
main();
