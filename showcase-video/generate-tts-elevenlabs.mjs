// Generate TTS using ElevenLabs through Fal.ai
// Better quality, consistent voice, speed control
import { writeFileSync, mkdirSync } from 'fs';

const FAL_KEY = '860a2503-a1df-4a34-8a80-bccd3b886199:485923d8f1e71ea4026d386ef16c5b59';

// Each segment - keeping them short for reliability
const segments = [
  {
    id: 'intro',
    text: `State of AI, January 2026. Here's my opinionated take on the major AI labs.`
  },
  {
    id: 'landscape',
    text: `Let's start with the landscape. We have the closed-source giants: OpenAI, Anthropic, Google, and xAI. Then the open-weight challengers, mostly from China: Alibaba, ByteDance, DeepSeek, and Zhipu.`
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
    text: `Chinese labs are emerging as strong contenders. GLM 4.7 from Zhipu works as the poor man's Opus, at substantial cost savings. ByteDance's Seedream offers competitive image generation.`
  },
  {
    id: 'meta',
    text: `As for Llama from Facebook? Total joke. Avoid it.`
  },
  {
    id: 'tiers',
    text: `Here's my tier list. In the great tier: Opus 4.5, GPT 5.2, Gemini 3 Pro, and GLM 4.7. The decent tier has Grok, DeepSeek, and some others. And in the trash tier? Llama.`
  },
  {
    id: 'top-models',
    text: `My top four models right now: Number one, Claude Opus 4.5. Number two, GPT 5.2. Number three, Gemini 3 Pro. And number four, GLM 4.7.`
  },
  {
    id: 'overview',
    text: `Here's the full picture of all the models I evaluated. Each card shows my rating and key observations.`
  },
  {
    id: 'cta',
    text: `That's my state of AI for January 2026. Check out the full article on my Substack for the detailed breakdown.`
  }
];

async function generateTTS(segment) {
  console.log(`\nGenerating: ${segment.id}`);
  console.log(`  "${segment.text.substring(0, 50)}..."`);

  const response = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: segment.text,
      voice: 'George', // Professional male voice
      speed: 0.95,     // Slightly slower for clarity
      stability: 0.7,  // Higher stability for consistency
      similarity_boost: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`  Failed: ${error}`);
    return null;
  }

  const result = await response.json();
  const audioUrl = result.audio?.url || result.audio_url;

  if (audioUrl) {
    console.log(`  Downloading...`);
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const filePath = `./public/audio/${segment.id}.mp3`;
    writeFileSync(filePath, Buffer.from(audioBuffer));

    // Get duration
    const { execSync } = await import('child_process');
    const duration = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`).toString().trim();
    console.log(`  Saved: ${filePath} (${parseFloat(duration).toFixed(2)}s)`);
    return { id: segment.id, path: filePath, duration: parseFloat(duration) };
  }

  return null;
}

async function main() {
  mkdirSync('./public/audio', { recursive: true });

  console.log('Generating TTS with ElevenLabs...');
  console.log(`Total segments: ${segments.length}`);

  let totalChars = 0;
  for (const seg of segments) {
    totalChars += seg.text.length;
  }
  console.log(`Total characters: ${totalChars}`);
  console.log(`Estimated cost: $${(totalChars / 1000 * 0.10).toFixed(2)}`);

  const results = [];
  for (const segment of segments) {
    const result = await generateTTS(segment);
    if (result) {
      results.push(result);
    }
    // Small delay between calls
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n\nAll segments generated!');
  console.log('Durations:', results.map(r => `${r.id}: ${r.duration.toFixed(2)}s`).join(', '));

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Total duration: ${totalDuration.toFixed(2)}s`);

  writeFileSync('./public/audio/manifest.json', JSON.stringify(results, null, 2));
}

main().catch(console.error);
