import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
} from "remotion";

// Exact font family from CSS
const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif";

// Exact colors from CSS variables
const colors = {
  background: "#f8f9fb",
  white: "#ffffff",
  text: "#111827",
  textMuted: "#4b5563",
  infoText: "#6b7280",
  border: "#d4d6dd",
  buttonBg: "#111827",
  // Source colors (light mode)
  sourceLLM: "#2563eb",
  sourceMedia: "#0ea5e9",
  sourceFal: "#f59e0b",
  sourceReplicate: "#10b981",
  sourceOpenRouter: "#7c3aed",
  sourceHype: "#ec4899",
  sourceBlog: "#f97316",
  sourceMonitor: "#dc2626",
  sourceTestingCatalog: "#047857",
};

// Scene 1: Intro matching exact app header
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 30], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sourcesOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // All 9 source colors from the app
  const sources = [
    { name: "Artificial Analysis (LLMs)", color: colors.sourceLLM },
    { name: "Artificial Analysis (Media)", color: colors.sourceMedia },
    { name: "fal.ai", color: colors.sourceFal },
    { name: "Replicate", color: colors.sourceReplicate },
    { name: "OpenRouter", color: colors.sourceOpenRouter },
    { name: "Hype Signals", color: colors.sourceHype },
    { name: "Monitor Feed", color: colors.sourceMonitor },
    { name: "Blog", color: colors.sourceBlog },
    { name: "Testing Catalog", color: colors.sourceTestingCatalog },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: 60,
      }}
    >
      <h1
        style={{
          fontSize: 48,
          fontWeight: 600,
          color: colors.text,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          margin: 0,
          fontFamily,
        }}
      >
        AI Model Analysis Dashboard
      </h1>

      <p
        style={{
          fontSize: 18,
          color: colors.infoText,
          opacity: subtitleOpacity,
          marginTop: 12,
          fontFamily,
        }}
      >
        Powered by Artificial Analysis, OpenRouter, Fal, and Replicate APIs
      </p>

      {/* Source color legend - matching exact app style */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
          marginTop: 40,
          opacity: sourcesOpacity,
          maxWidth: 1000,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginRight: 4, fontFamily }}>
          Source colors
        </span>
        {sources.map((source, i) => (
          <div
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              backgroundColor: colors.white,
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: source.color,
              }}
            />
            <span style={{ fontSize: 13, color: source.color, fontFamily }}>
              {source.name}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: LLM Models - 9 cards filling screen (3 rows) - REAL DATA
const LLMScene: React.FC = () => {
  const frame = useCurrentFrame();

  const models = [
    { name: "GPT-5.2 (xhigh)", provider: "OpenAI", speed: "103.059 t/s", ttft: "36.573s", coding: "48.7", intel: "51.1", math: "99.0", input: "$1.75", output: "$14" },
    { name: "Claude Opus 4.5 (Reasoning)", provider: "Anthropic", speed: "83.057 t/s", ttft: "1.643s", coding: "47.8", intel: "49.6", math: "91.3", input: "$5", output: "$25" },
    { name: "GPT-5.2 Codex (xhigh)", provider: "OpenAI", speed: "N/A", ttft: "N/A", coding: "43.0", intel: "48.8", math: "N/A", input: "N/A", output: "N/A" },
    { name: "Gemini 3 Pro Preview (high)", provider: "Google", speed: "116.344 t/s", ttft: "31.671s", coding: "46.5", intel: "48.4", math: "95.7", input: "$2", output: "$12" },
    { name: "GPT-5.1 (high)", provider: "OpenAI", speed: "93.418 t/s", ttft: "42.563s", coding: "44.7", intel: "47.5", math: "94.0", input: "$1.25", output: "$10" },
    { name: "Gemini 3 Flash Preview (Reasoning)", provider: "Google", speed: "200.615 t/s", ttft: "12.955s", coding: "42.6", intel: "46.2", math: "97.0", input: "$0.5", output: "$3" },
    { name: "GPT-5.2 (medium)", provider: "OpenAI", speed: "N/A", ttft: "N/A", coding: "44.2", intel: "45.8", math: "N/A", input: "N/A", output: "N/A" },
    { name: "GPT-5 (high)", provider: "OpenAI", speed: "111.203 t/s", ttft: "103.962s", coding: "36.0", intel: "44.5", math: "N/A", input: "N/A", output: "N/A" },
    { name: "GPT-5 Codex (high)", provider: "OpenAI", speed: "156.424 t/s", ttft: "22.339s", coding: "38.9", intel: "44.4", math: "N/A", input: "N/A", output: "N/A" },
  ];

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 40 }}>
      {/* Header */}
      <div style={{ opacity: headerOpacity, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: colors.text, margin: 0, fontFamily }}>
            Large Language Models
          </h2>
          <span style={{ fontSize: 14, color: colors.infoText, fontFamily }}>
            Showing 384 of 384 models
          </span>
        </div>
      </div>

      {/* 3 rows of 3 cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((row) => (
          <div key={row} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {models.slice(row * 3, row * 3 + 3).map((model, i) => {
              const idx = row * 3 + i;
              const delay = idx * 4;
              const cardOpacity = interpolate(frame, [10 + delay, 22 + delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const cardY = interpolate(frame, [10 + delay, 22 + delay], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

              return (
                <div
                  key={i}
                  style={{
                    width: "32%",
                    backgroundColor: colors.white,
                    border: `1px solid ${colors.border}`,
                    borderTop: `4px solid ${colors.sourceLLM}`,
                    borderRadius: 4,
                    padding: 16,
                    opacity: cardOpacity,
                    transform: `translateY(${cardY}px)`,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, fontFamily }}>{model.name}</h3>
                  <p style={{ fontSize: 13, color: colors.infoText, margin: "4px 0 12px 0", fontFamily }}>{model.provider}</p>

                  {/* Speed metrics */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, padding: 8, backgroundColor: colors.background, borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase", letterSpacing: 0.5 }}>OUTPUT SPEED</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, fontFamily }}>{model.speed}</div>
                    </div>
                    <div style={{ flex: 1, padding: 8, backgroundColor: colors.background, borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase", letterSpacing: 0.5 }}>TIME TO FIRST TOKEN</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, fontFamily }}>{model.ttft}</div>
                    </div>
                  </div>

                  {/* Evaluations */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6, fontFamily }}>Evaluations</div>
                    {[["Coding Index", model.coding], ["Intelligence Index", model.intel], ["Math Index", model.math]].map(([label, val], j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.infoText, marginBottom: 2, fontFamily }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 500 }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div style={{ padding: 10, backgroundColor: "#f0f4f8", borderRadius: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6, fontFamily }}>Pricing (per 1M tokens)</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily }}>
                      <span style={{ color: colors.infoText }}>Input</span>
                      <span style={{ fontWeight: 500 }}>{model.input}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily }}>
                      <span style={{ color: colors.infoText }}>Output</span>
                      <span style={{ fontWeight: 500 }}>{model.output}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Text-to-Image Models - 9 cards with ELO/Rank (3 rows) - REAL DATA
const ImageModelsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const models = [
    { name: "GPT Image 1.5 (high)", provider: "OpenAI", elo: 1246, rank: 1, conf: "-10/11", photo: 1265, cartoon: 1236, people: 1267 },
    { name: "Nano Banana Pro (Gemini 3 Pro)", provider: "Google", elo: 1217, rank: 2, conf: "-11/10", photo: 1267, cartoon: 1247, people: 1245 },
    { name: "FLUX.2 [max]", provider: "Black Forest Labs", elo: 1206, rank: 3, conf: "-12/14", photo: 1216, cartoon: 1266, people: 1202 },
    { name: "FLUX.2 [pro]", provider: "Black Forest Labs", elo: 1202, rank: 4, conf: "-10/10", photo: 1215, cartoon: 1228, people: 1208 },
    { name: "Riverflow 2 Preview", provider: "Sourceful", elo: 1188, rank: 5, conf: "-10/9", photo: 1200, cartoon: 1201, people: 1197 },
    { name: "Seedream 4.0", provider: "ByteDance Seed", elo: 1185, rank: 6, conf: "-8/8", photo: 1209, cartoon: 1169, people: 1198 },
    { name: "FLUX.2 [flex]", provider: "Black Forest Labs", elo: 1183, rank: 7, conf: "-9/9", photo: 1190, cartoon: 1195, people: 1185 },
    { name: "Seedream 4.5", provider: "ByteDance Seed", elo: 1167, rank: 8, conf: "-8/10", photo: 1175, cartoon: 1160, people: 1170 },
    { name: "Imagen 4 Ultra Preview 0606", provider: "Google", elo: 1165, rank: 9, conf: "-9/8", photo: 1170, cartoon: 1155, people: 1168 },
  ];

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 40 }}>
      {/* Header */}
      <div style={{ opacity: headerOpacity, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: colors.text, margin: 0, fontFamily }}>
            Text-to-Image Models
          </h2>
          <span style={{ fontSize: 14, color: colors.infoText, fontFamily }}>
            Showing 107 of 107 models
          </span>
        </div>
      </div>

      {/* 3 rows of 3 cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((row) => (
          <div key={row} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {models.slice(row * 3, row * 3 + 3).map((model, i) => {
              const idx = row * 3 + i;
              const delay = idx * 4;
              const cardOpacity = interpolate(frame, [10 + delay, 22 + delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

              return (
                <div
                  key={i}
                  style={{
                    width: "32%",
                    backgroundColor: colors.white,
                    border: `1px solid ${colors.border}`,
                    borderTop: `4px solid ${colors.sourceMedia}`,
                    borderRadius: 4,
                    padding: 16,
                    opacity: cardOpacity,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, fontFamily }}>{model.name}</h3>
                  <p style={{ fontSize: 13, color: colors.infoText, margin: "4px 0 12px 0", fontFamily }}>{model.provider}</p>

                  {/* ELO and Rank */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, padding: 8, backgroundColor: colors.background, borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase" }}>ELO SCORE</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.sourceLLM, fontFamily }}>{model.elo}</div>
                    </div>
                    <div style={{ flex: 1, padding: 8, backgroundColor: model.rank <= 3 ? "#fef3c7" : colors.background, borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase" }}>RANK</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily }}>#{model.rank}</div>
                    </div>
                  </div>

                  {/* Confidence Interval */}
                  <div style={{ padding: 8, backgroundColor: colors.background, borderRadius: 4, textAlign: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase" }}>CONFIDENCE INTERVAL</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: colors.text, fontFamily }}>{model.conf}</div>
                  </div>

                  {/* Category Breakdown */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6, fontFamily }}>Category Breakdown</div>
                    {[["General & Photorealistic", model.photo], ["Cartoon & Illustration", model.cartoon], ["People: Portraits", model.people]].map(([label, val], j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.infoText, marginBottom: 2, fontFamily }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 500 }}>ELO: {val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: OpenRouter Models - LEFT border, 6 cards
const OpenRouterScene: React.FC = () => {
  const frame = useCurrentFrame();

  const models = [
    { name: "Palmyra X5", provider: "Writer", context: "1.0M tokens", price: "$0.6000 / 1M", added: "1/21/2026", desc: "Writer's most advanced model for AI agents." },
    { name: "LFM2.5-1.2B-Thinking (free)", provider: "LiquidAI", context: "33K tokens", price: "$0.0000 / 1M", added: "1/20/2026", desc: "Lightweight reasoning model for agentic tasks." },
    { name: "LFM2.5-1.2B-Instruct (free)", provider: "LiquidAI", context: "33K tokens", price: "$0.0000 / 1M", added: "1/20/2026", desc: "Compact instruction-tuned for on-device AI." },
    { name: "GPT Audio", provider: "OpenAI", context: "128K tokens", price: "$2.50 / 1M", added: "1/19/2026", desc: "OpenAI's first audio model with natural voices." },
    { name: "GPT Audio Mini", provider: "OpenAI", context: "128K tokens", price: "$0.6000 / 1M", added: "1/19/2026", desc: "Cost-efficient GPT Audio with voice consistency." },
    { name: "GLM 4.7 Flash", provider: "Z.AI", context: "200K tokens", price: "$0.0700 / 1M", added: "1/19/2026", desc: "30B-class SOTA for agentic coding use cases." },
    { name: "GPT-5.2-Codex", provider: "OpenAI", context: "400K tokens", price: "$1.75 / 1M", added: "1/14/2026", desc: "Upgraded GPT-5.1-Codex for software engineering." },
    { name: "Molmo2 8B (free)", provider: "AllenAI", context: "37K tokens", price: "$0.0000 / 1M", added: "1/9/2026", desc: "Open vision-language model from AllenAI." },
    { name: "Olmo 3.1 32B Instruct", provider: "AllenAI", context: "66K tokens", price: "$0.2000 / 1M", added: "1/6/2026", desc: "Large-scale instruction-tuned language model." },
    { name: "Seed 1.6 Flash", provider: "ByteDance Seed", context: "262K tokens", price: "$0.0750 / 1M", added: "1/5/2026", desc: "Fast inference model from ByteDance Seed." },
    { name: "Seed 1.6", provider: "ByteDance Seed", context: "262K tokens", price: "$0.2500 / 1M", added: "1/5/2026", desc: "ByteDance Seed's flagship model." },
    { name: "MiniMax M2.1", provider: "MiniMax", context: "197K tokens", price: "$0.2700 / 1M", added: "1/4/2026", desc: "MiniMax's advanced conversational AI model." },
  ];

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 40 }}>
      {/* Header */}
      <div style={{ opacity: headerOpacity, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: colors.text, margin: 0, fontFamily }}>
            OpenRouter Models
          </h2>
          <span style={{ fontSize: 14, color: colors.infoText, fontFamily }}>
            Showing 345 of 345 models
          </span>
        </div>
      </div>

      {/* 4 rows of 3 cards - LEFT border for OpenRouter */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {models.slice(row * 3, row * 3 + 3).map((model, i) => {
              const idx = row * 3 + i;
              const delay = idx * 3;
              const cardOpacity = interpolate(frame, [8 + delay, 18 + delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

              return (
                <div
                  key={i}
                  style={{
                    width: "32%",
                    backgroundColor: colors.white,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${colors.sourceOpenRouter}`,
                    borderRadius: 4,
                    padding: 16,
                    opacity: cardOpacity,
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: 0, fontFamily }}>{model.name}</h3>
                  <p style={{ fontSize: 13, color: colors.infoText, margin: "4px 0 12px 0", fontFamily }}>{model.provider}</p>

                  {/* Context and Pricing */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, padding: 8, backgroundColor: colors.background, borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase" }}>CONTEXT</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: colors.text, fontFamily }}>{model.context}</div>
                    </div>
                    <div style={{ flex: 1, padding: 8, backgroundColor: colors.background, borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: colors.infoText, marginBottom: 2, fontFamily, textTransform: "uppercase" }}>PRICING</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: colors.text, fontFamily }}>{model.price}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: colors.infoText, marginBottom: 4, fontFamily }}>
                    <strong style={{ color: colors.text }}>Added:</strong> {model.added}
                  </div>

                  <p style={{ fontSize: 12, color: colors.text, lineHeight: 1.5, margin: 0, fontFamily }}>
                    {model.desc}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: Stats with count-up
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: 384, label: "LLMs", color: colors.sourceLLM },
    { value: 107, label: "Image Models", color: colors.sourceMedia },
    { value: 345, label: "OpenRouter", color: colors.sourceOpenRouter },
    { value: 120, label: "Trending", color: colors.sourceHype },
  ];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.white,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <h2 style={{ fontSize: 40, fontWeight: 600, color: colors.text, marginBottom: 60, opacity: titleOpacity, fontFamily }}>
        Aggregated from Multiple Sources
      </h2>

      <div style={{ display: "flex", gap: 80 }}>
        {stats.map((stat, i) => {
          const delay = i * 10;
          const countUp = interpolate(frame, [20 + delay, 50 + delay], [0, stat.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const scale = spring({ frame: frame - (20 + delay), fps, config: { damping: 15, stiffness: 80 } });

          return (
            <div key={i} style={{ textAlign: "center", transform: `scale(${Math.max(0, scale)})` }}>
              <div style={{ fontSize: 72, fontWeight: 700, color: stat.color, fontFamily }}>{Math.round(countUp)}+</div>
              <div style={{ fontSize: 18, color: colors.infoText, marginTop: 8, fontFamily }}>{stat.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 6: Outro
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const subtitleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.white,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 600, color: colors.text, textAlign: "center", transform: `scale(${titleScale})`, margin: 0, fontFamily }}>
        AI Model Analysis Dashboard
      </h1>

      <p style={{ fontSize: 20, color: colors.infoText, opacity: subtitleOpacity, marginTop: 16, fontFamily }}>
        Your single source of truth for AI models
      </p>

      <div style={{ marginTop: 40, padding: "12px 36px", backgroundColor: colors.buttonBg, borderRadius: 4, opacity: ctaOpacity }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: colors.white, fontFamily }}>Try It Free</span>
      </div>

      <p style={{ fontSize: 14, color: colors.infoText, marginTop: 30, opacity: subtitleOpacity, fontFamily }}>
        Built by Adam Holter
      </p>
    </AbsoluteFill>
  );
};

// Main Showcase
export const Showcase: React.FC = () => {
  const fps = 30;
  const introDuration = fps * 5;
  const llmDuration = fps * 5;
  const imageDuration = fps * 5;
  const openRouterDuration = fps * 5;
  const statsDuration = fps * 4;
  const outroDuration = fps * 4;

  let offset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.white }}>
      <Sequence from={offset} durationInFrames={introDuration}><IntroScene /></Sequence>
      {(offset += introDuration)}
      <Sequence from={offset} durationInFrames={llmDuration}><LLMScene /></Sequence>
      {(offset += llmDuration)}
      <Sequence from={offset} durationInFrames={imageDuration}><ImageModelsScene /></Sequence>
      {(offset += imageDuration)}
      <Sequence from={offset} durationInFrames={openRouterDuration}><OpenRouterScene /></Sequence>
      {(offset += openRouterDuration)}
      <Sequence from={offset} durationInFrames={statsDuration}><StatsScene /></Sequence>
      {(offset += statsDuration)}
      <Sequence from={offset} durationInFrames={outroDuration}><OutroScene /></Sequence>
    </AbsoluteFill>
  );
};
