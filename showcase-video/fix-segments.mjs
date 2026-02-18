// Fix the segments that had TTS glitches
import { writeFileSync } from 'fs';

const FAL_KEY = '860a2503-a1df-4a34-8a80-bccd3b886199:485923d8f1e71ea4026d386ef16c5b59';

// Reworded segments that had issues
const segments = [
  {
    id: 'google',
    text: `Google made a comeback with Gemini 3. Multimodal is impressive, but language model reliability is still an issue.`
  },
  {
    id: 'meta',
    text: `And Meta? Total joke. Don't bother with their models.`
  },
  {
    id: 'overview',
    text: `Here's every model I tested. Each card shows my rating and notes.`
  }
];

async function generateTTS(segment) {
  console.log(`\nGenerating TTS for: ${segment.id}`);
  console.log(`  Text: "${segment.text}"`);

  const response = await fetch('https://fal.run/fal-ai/dia-tts', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: segment.text,
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
    console.log(`  Downloading audio...`);
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const filePath = `./public/audio/${segment.id}.wav`;
    writeFileSync(filePath, Buffer.from(audioBuffer));
    console.log(`  Saved: ${filePath}`);

    // Check file size
    const stats = await import('fs').then(fs => fs.statSync(filePath));
    console.log(`  Size: ${(stats.size / 1024).toFixed(1)}KB`);
    return filePath;
  }

  return null;
}

async function main() {
  for (const segment of segments) {
    await generateTTS(segment);
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('\nDone!');
}

main().catch(console.error);
