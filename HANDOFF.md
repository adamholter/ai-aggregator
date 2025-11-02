# Handoff: Agent EXP Minimal Implementation

## Goal
Ship a fresh "Agent EXP" tab that hosts a minimal OpenRouter-powered chatbot. This experimental agent must:

1. Use OpenRouter Tools API with exactly two tools:
   - `fetch_data` (server-side existing endpoint) with optional `limit` parameter so the LLM can cap returned rows (default 50, but accepts null for full data) and access any tab category, including experimental ones when enabled.
   - `ask_perplexity` that proxies queries to `perplexity/sonar-pro-search`, automatically prepending the system prompt clarifying we are inside an AI model research dashboard and must rely on it's research. It's knowledge cut-off is 100% outdated.
2. Default the model selector to `x-ai/grok-4-fast`, but allow the user to switch among available OpenRouter models retrieved for the agent.
3. Respect experimental mode: when experimental is ON, the tool metadata should list additional tabs (Hype, Monitor, Blog, Latest) and clarify when to use each (e.g., Latest with timeframe=week for news, Hype for community buzz, Monitor for MatVid/X feed, etc.). When OFF, limit to core leaderboards.
4. Stream responses and conversation history exactly like a basic OpenRouter chatbot (no legacy loop baggage). Ensure the user’s OpenRouter key is required client-side, but never expose server keys.

## Compression Context For Prompt
The `fetch_data` helper today returns:
- `metadata`: category id/label/count/source
- `structured` JSON with `category_summaries`, `highlights`, and structured metrics
- `markdown`: synthesized overview per category
- `compressed` snapshot built via `compose_compressed_datasets` (token-efficient tables)
The new system prompt must explicitly tell the model that all datasets arrive in that compact triplet (structured JSON + markdown summary + compressed tables) and that this representation is authoritative.

## Deliverables
1. **Backend**: `/api/agent-exp` endpoint that:
   - Validates the user’s OpenRouter key and forwards chat requests to OpenRouter Tools API.
   - Registers `fetch_data` (with optional `limit`, `timeframe`, and tab list) and `ask_perplexity` tools.
   - Builds the system prompt with tab descriptions, compression notes, and experimental-mode guidance. Use `x-ai/grok-4-fast` as default model.
   - Streams OpenRouter responses back to the browser.
2. **Frontend**: new "Agent EXP" tab (experimental) with a barebones chat UI (reuse existing components where possible) plus model selector defaulting to `x-ai/grok-4-fast`.
3. **Logging**: Console + network diagnostics showing each tool call payload and the datasets returned (categories + limits) so we can verify the model input easily.
4. **Tests**: Smoke test by asking for fal.ai image models in experimental mode; confirm:
   - `fetch_data` is invoked with limit=50 (unless overridden by the model) and returns fal.ai data.
   - Model can request Perplexity search and the proxy returns results.
   - Streaming works end-to-end without unsupported-tool failures.

## Notes
- Reuse existing server utilities for dataset compression instead of reimplementing them.
- Remove or bypass the legacy agent loop for this new endpoint; keep the old agent untouched.
- Update docs or UI copy as needed to clarify the experimental status.


### Below is the exact user's prompt that led to the creation of this file for context.
What I don't understand is why the AI agent isn't super simple to do.

Because right now, the UI for it keeps failing no matter what we do.

This should be a very, very basic open router chatbot

All I need to do is use the Tools API from OpenRouter to expose two tools.

One tool is Perplexity Search. That tool lets it pass a query to Perplexity, and Perplexity is given an extra system prompt that lets it know the context that we are in an AI model research application. So it cannot rely on any of its internal knowledge and must rely on its search for all information because its knowledge cutoff is outdated.

So it should be a very basic tool. Ask Perplexity, and the input is just the prompt that it gives. We automatically handle the system prompt in the background. By the way, there's a new Perplexity model that I would like to be powering this, and it's available on OpenRouter, so the model ID is perplexity/sonar-pro-search

And then the other tool is just fetch data.

In experimental mode, we want it to be able to search all sorts of tabs. If experimental mode is off, then we just limit it to the basics. But it needs a list of tabs.

I want you to tell me our system for compressing the data that it gets back because I'm not sure that you actually know what it is. I gave it in another thread, and I don't know if it's documented in the codebase or not, but we have a system to make sure that the data that comes back is token efficient for the LLM.

Also, it should be able to pass in another parameter for limit, and it should limit the number of results that come back. For a leaderboard, if the limit is 50, then it just grabs the top 50 on that leaderboard. Or for Fal AI, it would be the most recent 50 so that it doesn't have to overwhelm its context. 50 is probably a good default for that, but it can set that limit higher if it wants, or set it to null to get all the data if it really, really needs it.

It should be given the list of valid tab names to fetch, a description of what data is in each of those, and when it should get that information.

If it's looking for news and experimental mode is on, so the extra tabs are available, then it might search the Hype tab, the Monitor tab, the Blog tab, and maybe the Latest tab. The Latest tab would probably be set to week. For the Latest tab, it should be able to set it to day or week as a parameter it can pass in. So, if it's asked for news, it should probably just pull the Latest tab set to Week. It should also be able to decide if the Hype tab is enabled for the latest so that you can use that as its main news source if it wants recent data.

If it's asked about an image generation thing, then it should grab image editing and text-to-image leaderboards, as well as Fal.ai and Replicate. It needs enough context about each tab to know when it should reach for those and prompting around that. Most of that is just system prompt stuff that we need to set. So, we need the two tools set up and we need the system prompt.

Other than that, it's just a normal OpenRouter chatbot with streaming and conversation context, so back and forth responses being sent, which is super standard and should be really easy to implement. We also need to add the model selector so that you can choose the model.

What I want you to do is add another tab for Agent EXP, which we will use as this experimental version where we're just trying to implement the minimum requirements to make the agent work instead of all of the baggage that comes with the current Agent tab and trying to fix that. So, add this other tab, Agent EXP, and set it up with the minimal version.

Bad tool calls seems like a model issue. Let's default the model to this so that the tool calling is more reliable.
x-ai/grok-4-fast