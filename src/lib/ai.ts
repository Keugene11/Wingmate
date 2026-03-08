import { createOpenAI } from "@ai-sdk/openai";

export const dedalus = createOpenAI({
  apiKey: process.env.DEDALUS_API_KEY,
  baseURL: "https://api.dedaluslabs.ai/v1",
});
