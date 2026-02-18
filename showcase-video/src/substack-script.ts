// Narration script for "State of AI, January 2026" Substack post
// Optimized for TTS - approximately 1500 characters = ~$0.06 at $0.04/1000 chars

export const narrationScript = `
State of AI, January 2026. Here's my opinionated assessment of the major AI labs.

Anthropic is leading the pack. Opus is incredible. Everyone I know says it's either the best or one of the best models in the world. Claude Code and Claude Chrome are excellent too.

Google had a resurgence with Gemini 3. Their multimodal capabilities are impressive, though language model reliability remains an issue for developers.

OpenAI is no longer my default choice. They're still superior for STEM applications, but the UI capabilities lag behind.

xAI focuses on cost efficiency with Grok 4 Fast. The upcoming Grok 4.20 looks promising for UI tasks.

Chinese labs are emerging as strong contenders. GLM 4.7 from Z AI works as "the poor man's Opus" at substantial cost savings. ByteDance's Seedream offers competitive image generation.

As for Meta? They're a joke. Don't use their stuff.

My top tier rankings: GPT-5.2, Claude Opus 4.5, GLM 4.7, and Gemini 3 Pro.

That's the state of AI in January 2026. Check out the full article on my Substack for the detailed breakdown.
`.trim();

// Word timings will be generated after TTS processing
export type WordTiming = {
  word: string;
  startMs: number;
  endMs: number;
};
