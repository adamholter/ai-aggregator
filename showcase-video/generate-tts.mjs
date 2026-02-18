// Generate TTS audio using Fal.ai Dia-TTS
// Run with: node generate-tts.mjs

import { writeFileSync } from 'fs';

// Rewritten to avoid TTS repetition glitches
const narrationScript = `
State of AI, January 2026. Here's my opinionated assessment of the major AI labs.

Anthropic is leading the pack. Opus is incredible. Everyone says it's either the best or one of the best models out there. Their developer tools like Claude Code and Claude Chrome are also excellent.

Google had a resurgence with Gemini 3. Multimodal capabilities are impressive, but language model reliability remains an issue.

OpenAI is no longer my default choice. They're superior for STEM applications, but UI capabilities lag behind.

xAI focuses on cost efficiency with Grok 4 Fast. Grok 4.20 looks promising for UI tasks.

Chinese labs are emerging as strong contenders. GLM 4.7 from Z AI is the poor man's Opus at major cost savings. ByteDance's Seedream offers competitive image generation.

As for Meta? They're a joke. Don't use their stuff.

My top tier rankings: Opus 4.5, GPT 5.2, Gemini 3 Pro, and GLM 4.7.

That's the state of AI in January 2026. Check out the full article on my Substack.
`.trim();

const FAL_KEY = '860a2503-a1df-4a34-8a80-bccd3b886199:485923d8f1e71ea4026d386ef16c5b59';

async function generateTTS() {
  console.log('Generating TTS for script...');
  console.log('Script length:', narrationScript.length, 'characters');
  console.log('Estimated cost: $' + (narrationScript.length / 1000 * 0.04).toFixed(3));

  const response = await fetch('https://fal.run/fal-ai/dia-tts', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: narrationScript,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TTS generation failed:', error);
    process.exit(1);
  }

  const result = await response.json();
  console.log('TTS generated successfully!');
  console.log('Audio URL:', result.audio?.url || result.audio_url);

  // Download the audio file
  const audioUrl = result.audio?.url || result.audio_url;
  if (audioUrl) {
    console.log('Downloading audio...');
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    writeFileSync('./public/narration.mp3', Buffer.from(audioBuffer));
    console.log('Audio saved to public/narration.mp3');
  }

  // Save full result for debugging
  writeFileSync('./tts-result.json', JSON.stringify(result, null, 2));
  console.log('Full result saved to tts-result.json');
}

generateTTS().catch(console.error);
