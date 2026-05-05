import { config } from "dotenv";

config({ path: ".env.local" });

import {
  generateChatReply,
  GEMINI_PRIMARY_MODEL,
  GEMINI_FALLBACK_MODEL,
} from "../src/lib/ai/gemini";

async function main() {
  console.log(
    `[smoke] primary=${GEMINI_PRIMARY_MODEL} fallback=${GEMINI_FALLBACK_MODEL}`,
  );
  const start = Date.now();
  const result = await generateChatReply([
    {
      role: "user",
      content:
        "HFIX 4㎟ 전선의 정격 허용전류와 KEC 기준 색상 규정을 간단히 알려주세요.",
    },
  ]);
  const elapsedMs = Date.now() - start;

  console.log("---- response ----");
  console.log(result.text);
  console.log("---- meta ----");
  console.log({
    elapsedMs,
    modelUsed: result.modelUsed,
    fellBack: result.fellBack,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
}

main().catch((e) => {
  console.error("[smoke] failed:", e);
  process.exit(1);
});
