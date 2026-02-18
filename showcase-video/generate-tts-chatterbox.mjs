// Generate TTS using Chatterbox Turbo
import { writeFileSync, mkdirSync } from 'fs';

const FAL_KEY = '860a2503-a1df-4a34-8a80-bccd3b886199:485923d8f1e71ea4026d386ef16c5b59';

// Updated segments to match actual image content
const segments = [
  {
    id: 'intro',
    text: `State of AI, January 2026. Here's my opinionated take on the major AI labs.`
  },
  {
    id: 'landscape',
    text: `Let's look at the landscape. On the closed side, we have Claude Opus 4.5 and GPT 5.2 Thinking as the big players, along with various Gemini and GPT variants. On the open side, there's DeepSeek, Kimi, GLM, Qwen, and the Llama models.`
  },
  {
    id: 'anthropic',
    text: `Anthropic is leading the pack. Opus is incredible. Everyone I know says it's either the best or one of the best models out there. Their developer tools, Claude Code and Claude Chrome, are also excellent.`
  },
  {
    id: 'google',
    text: `Google had a resurgence with Gemini 3. Their multimodal capabilities are impressive. But language model reliability remains an issue for developers.`
  },
  {
    id: 'openai',
    text: `OpenAI is no longer my default choice. They're still superior for STEM applications, but their UI capabilities lag behind the competition.`
  },
  {
    id: 'xai',
    text: `xAI is focused on cost efficiency with Grok 4 Fast. The upcoming Grok 4.20 looks promising for UI tasks.`
  },
  {
    id: 'chinese',
    text: `Chinese labs are emerging as strong contenders. GLM 4.7 works as the poor man's Opus, at substantial cost savings. ByteDance's Seedream offers competitive image generation.`
  },
  {
    id: 'meta',
    text: `As for Llama from Facebook? Total joke. Avoid it.`
  },
  {
    id: 'tiers',
    text: `Here's my tier list. Great models you should use 80% of the time: Claude Opus 4.5, GPT 5.2 Thinking, Gemini 3 Pro, GLM 4.7, and Minimax M2.1. Though Opus is almost too expensive to use that often. Decent models for specialized tasks make up the other 20%. And in the trash? Llama.`
  },
  {
    id: 'top-models',
    text: `My top four in detail. GPT 5.2 Thinking is the King - best world knowledge, very creative, but slow and bad at frontend. Claude Opus 4.5 is the Artisan - great at coding, writing, and design, but expensive. GLM 4.7 is the Apprentice - cheap and blazing fast, but weak on heavy reasoning. And Gemini 3 Pro is the Sorcerer - very smart with long context, but bad at writing.`
  },
  {
    id: 'overview',
    text: `Here's the full picture with all the models I evaluated and their detailed ratings.`
  },
  {
    id: 'cta',
    text: `That's my state of AI for January 2026. Check out the full article on my Substack for the detailed breakdown.`
  }
];

async function generateTTS(segment) {
  console.log(`\nGenerating: ${segment.id}`);
  console.log(`  "${segment.text.substring(0, 50)}..."`);

  const response = await fetch('https://fal.run/fal-ai/chatterbox/text-to-speech/turbo', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: segment.text,
      voice: 'brian',
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`  Failed: ${error}`);
    return null;
  }

  const result = await response.json();
  const audioUrl = result.audio?.url || result.audio;

  if (audioUrl) {
    console.log(`  Downloading...`);
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const filePath = `./public/audio/${segment.id}.wav`;
    writeFileSync(filePath, Buffer.from(audioBuffer));

    const { execSync } = await import('child_process');
    const duration = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`).toString().trim();
    console.log(`  Saved: ${filePath} (${parseFloat(duration).toFixed(2)}s)`);
    return { id: segment.id, path: filePath, duration: parseFloat(duration) };
  }

  return null;
}

async function main() {
  mkdirSync('./public/audio', { recursive: true });

  console.log('Generating TTS with Chatterbox Turbo...');
  console.log(`Total segments: ${segments.length}`);

  const results = [];
  for (const segment of segments) {
    const result = await generateTTS(segment);
    if (result) {
      results.push(result);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n\nAll segments generated!');

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Total duration: ${totalDuration.toFixed(2)}s`);

  // Output durations for code update
  console.log('\nDURATIONS for SubstackVideo.tsx:');
  console.log('const DURATIONS = {');
  for (const r of results) {
    const key = r.id === 'top-models' ? 'topModels' : r.id;
    console.log(`  ${key}: ${r.duration.toFixed(2)},`);
  }
  console.log('};');

  writeFileSync('./public/audio/manifest.json', JSON.stringify(results, null, 2));
}

main().catch(console.error);
