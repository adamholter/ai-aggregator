import { OpenRouter, callModel, tool } from '@openrouter/agent';
import { z } from 'zod';

const requestText = await new Promise((resolve, reject) => {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => resolve(input));
  process.stdin.on('error', reject);
});

const payload = JSON.parse(requestText || '{}');
const model = payload.model || 'google/gemma-3-27b-it';
const prompt = String(payload.prompt || '').trim();
const current = payload.current || {};
const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];

const patchSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(800),
  preset: z.string().min(1).max(80).optional(),
  rules: z.object({
    mode: z.enum(['standard', 'alternating', 'script']),
    birth: z.array(z.number().int().min(0).max(8)).optional(),
    survive: z.array(z.number().int().min(0).max(8)).optional(),
    alternate: z.array(z.object({
      birth: z.array(z.number().int().min(0).max(8)),
      survive: z.array(z.number().int().min(0).max(8)),
      label: z.string().max(80).optional(),
    })).min(2).max(4).optional(),
    script: z.string().max(1600).optional(),
  }),
  config: z.object({
    rows: z.number().int().min(12).max(120).optional(),
    cols: z.number().int().min(12).max(160).optional(),
    wrap: z.boolean().optional(),
    speed: z.number().int().min(30).max(1000).optional(),
    density: z.number().min(0).max(1).optional(),
    colors: z.object({
      alive: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      born: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      dying: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }).optional(),
  }).optional(),
  seed: z.object({
    action: z.enum(['keep', 'clear', 'randomize', 'pattern']),
    pattern: z.array(z.tuple([z.number().int(), z.number().int()])).max(1000).optional(),
  }).optional(),
  notes: z.array(z.string().max(180)).max(6).optional(),
});

const proposeLifePatch = tool({
  name: 'propose_life_patch',
  description: 'Return a complete, structured Game of Life simulation patch for the UI to preview and apply.',
  inputSchema: patchSchema,
  execute: async (patch) => patch,
});

const system = `You are the in-page simulation designer for a Conway's Game of Life workbench.

Return exactly one proposed patch by calling propose_life_patch. Do not answer without the tool call.

The client supports:
- standard rules with birth/survive neighbor counts.
- alternating rules, where alternate[step % alternate.length] is used each generation.
- script rules for complex/meta behavior. A script must be a JavaScript expression or function body evaluated per cell with variables alive, neighbors, row, col, age, generation, rows, cols, and get(r,c). It must return true for alive next step and false for dead. Keep scripts deterministic, concise, and bounded.

Prefer readable B/S rules when possible. Use script only when needed for genuinely complex or meta rules.
If the user asks to edit the existing simulation, preserve unrelated current settings.
Good examples:
- spawning with only two neighbors: birth [2], survive [2,3].
- alternating rules: mode alternating with two B/S entries.
- pulses, edges, parity, aging, or generation-aware rules: mode script.
`;

const messages = [
  { role: 'system', content: system },
  ...history.map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: String(item.content || '').slice(0, 1200),
  })),
  {
    role: 'user',
    content: JSON.stringify({ request: prompt, currentSimulation: current }, null, 2),
  },
];

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  httpReferer: process.env.OPENROUTER_SITE_URL,
  appTitle: process.env.OPENROUTER_APP_NAME || 'Life Agent Sandbox',
});

const input = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join('\n\n');
const result = callModel(client, {
  model,
  input,
  tools: [proposeLifePatch],
  maxToolCalls: 1,
}, {
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
    'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'Life Agent Sandbox',
  },
});

const toolResults = typeof result.getToolResults === 'function' ? await result.getToolResults() : [];
const first = Array.isArray(toolResults) && toolResults.length ? toolResults[0] : null;
let patch = first?.result || first?.output || first;

if (!patch || !patch.rules) {
  const text = typeof result.getText === 'function' ? await result.getText() : '';
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  patch = parsed.patch || parsed;
}

const checked = patchSchema.parse(patch);
process.stdout.write(JSON.stringify({ patch: checked }, null, 2));
