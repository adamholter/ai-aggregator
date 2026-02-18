import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
  Easing,
  Sequence,
  Img,
} from "remotion";
import { Audio } from "@remotion/media";

// Light mode color palette matching the hand-drawn aesthetic
const colors = {
  bg: "#FFFFFF",
  bgAlt: "#F8F9FA",
  text: "#1A1A1A",
  textMuted: "#666666",
  accent: "#000000",
  border: "#E5E5E5",
};

// Segment durations in seconds (from Chatterbox Turbo audio files)
const DURATIONS = {
  intro: 5.92,
  landscape: 18.08,
  anthropic: 13.16,
  google: 9.60,
  openai: 8.68,
  xai: 8.24,
  chinese: 12.04,
  meta: 3.36,
  tiers: 26.56,
  topModels: 29.32,
  overview: 4.36,
  cta: 6.72,
};

// Calculate start times
const STARTS = {
  intro: 0,
  landscape: DURATIONS.intro,
  anthropic: DURATIONS.intro + DURATIONS.landscape,
  google: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic,
  openai: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google,
  xai: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai,
  chinese: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai + DURATIONS.xai,
  meta: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai + DURATIONS.xai + DURATIONS.chinese,
  tiers: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai + DURATIONS.xai + DURATIONS.chinese + DURATIONS.meta,
  topModels: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai + DURATIONS.xai + DURATIONS.chinese + DURATIONS.meta + DURATIONS.tiers,
  overview: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai + DURATIONS.xai + DURATIONS.chinese + DURATIONS.meta + DURATIONS.tiers + DURATIONS.topModels,
  cta: DURATIONS.intro + DURATIONS.landscape + DURATIONS.anthropic + DURATIONS.google + DURATIONS.openai + DURATIONS.xai + DURATIONS.chinese + DURATIONS.meta + DURATIONS.tiers + DURATIONS.topModels + DURATIONS.overview,
};

// Title slide with elegant entrance
const TitleSlide: React.FC<{ durationSec: number; fps: number }> = ({ durationSec, fps }) => {
  const frame = useCurrentFrame();
  const progress = frame / (durationSec * fps);

  const opacity = interpolate(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(progress, [0, 0.25], [60, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(progress, [0.15, 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(progress, [0.1, 0.4], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: colors.text,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: -4,
          }}
        >
          State of AI
        </div>
        <div
          style={{
            width: lineWidth,
            height: 4,
            backgroundColor: colors.accent,
            marginTop: 20,
            marginBottom: 20,
          }}
        />
        <div
          style={{
            fontSize: 48,
            fontWeight: 300,
            color: colors.textMuted,
            fontFamily: "Inter, system-ui, sans-serif",
            opacity: subtitleOpacity,
          }}
        >
          January 2026
        </div>
        <div
          style={{
            fontSize: 28,
            color: colors.textMuted,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 50,
            opacity: subtitleOpacity,
          }}
        >
          by Adam Holter
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 3D animated image slide with Ken Burns effect
const Image3DSlide: React.FC<{
  imageSrc: string;
  title?: string;
  subtitle?: string;
  durationSec: number;
  fps: number;
  effect?: "zoomIn" | "zoomOut" | "panLeft" | "panRight" | "tiltUp" | "rotate3D";
}> = ({ imageSrc, title, subtitle, durationSec, fps, effect = "zoomIn" }) => {
  const frame = useCurrentFrame();
  const progress = frame / (durationSec * fps);

  // Fade in/out
  const opacity = interpolate(progress, [0, 0.05, 0.95, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title animation
  const titleOpacity = title
    ? interpolate(progress, [0.03, 0.1], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const titleY = interpolate(progress, [0.03, 0.1], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Different 3D effects for the image - slower, more subtle
  let imageTransform = "";

  switch (effect) {
    case "zoomIn": {
      const scale = interpolate(progress, [0, 1], [1, 1.08], {
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      });
      const rotateY = interpolate(progress, [0, 0.5, 1], [2, 0, -2], {
        extrapolateRight: "clamp",
      });
      imageTransform = `perspective(2000px) scale(${scale}) rotateY(${rotateY}deg)`;
      break;
    }
    case "zoomOut": {
      const scale = interpolate(progress, [0, 1], [1.1, 1], {
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      });
      const rotateX = interpolate(progress, [0, 0.5, 1], [-1.5, 0, 1.5], {
        extrapolateRight: "clamp",
      });
      imageTransform = `perspective(2000px) scale(${scale}) rotateX(${rotateX}deg)`;
      break;
    }
    case "panLeft": {
      const panX = interpolate(progress, [0, 1], [20, -20], {
        extrapolateRight: "clamp",
      });
      const tiltY = interpolate(progress, [0, 0.5, 1], [-1.5, 0, 1.5], {
        extrapolateRight: "clamp",
      });
      imageTransform = `perspective(2000px) translateX(${panX}px) rotateY(${tiltY}deg) scale(1.05)`;
      break;
    }
    case "panRight": {
      const panX = interpolate(progress, [0, 1], [-20, 20], {
        extrapolateRight: "clamp",
      });
      const tiltY = interpolate(progress, [0, 0.5, 1], [1.5, 0, -1.5], {
        extrapolateRight: "clamp",
      });
      imageTransform = `perspective(2000px) translateX(${panX}px) rotateY(${tiltY}deg) scale(1.05)`;
      break;
    }
    case "tiltUp": {
      const panY = interpolate(progress, [0, 1], [15, -15], {
        extrapolateRight: "clamp",
      });
      const rotateX = interpolate(progress, [0, 0.5, 1], [2, 0, -2], {
        extrapolateRight: "clamp",
      });
      imageTransform = `perspective(2000px) translateY(${panY}px) rotateX(${rotateX}deg) scale(1.05)`;
      break;
    }
    case "rotate3D": {
      const rotate = interpolate(progress, [0, 1], [-1, 1], {
        extrapolateRight: "clamp",
      });
      const rotateY = interpolate(progress, [0, 0.5, 1], [3, 0, -3], {
        extrapolateRight: "clamp",
      });
      const rotateX = interpolate(progress, [0, 0.5, 1], [-2, 0, 2], {
        extrapolateRight: "clamp",
      });
      imageTransform = `perspective(1500px) rotate(${rotate}deg) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.04)`;
      break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity,
      }}
    >
      {/* Title overlay */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 70,
            zIndex: 10,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: colors.text,
              fontFamily: "Inter, system-ui, sans-serif",
              textShadow: "0 2px 30px rgba(255,255,255,0.95)",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: colors.textMuted,
                fontFamily: "Inter, system-ui, sans-serif",
                marginTop: 8,
                textShadow: "0 2px 30px rgba(255,255,255,0.95)",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* 3D animated image container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: title ? "120px 60px 60px 60px" : 60,
        }}
      >
        <div
          style={{
            transform: imageTransform,
            transformOrigin: "center center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 8px 25px rgba(0,0,0,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
          }}
        >
          <Img
            src={staticFile(imageSrc)}
            style={{
              maxWidth: "100%",
              maxHeight: title ? "80vh" : "90vh",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Text-only slide for individual lab assessments
const LabTextSlide: React.FC<{
  lab: string;
  rating: string;
  quote: string;
  details: string;
  durationSec: number;
  fps: number;
}> = ({ lab, rating, quote, details, durationSec, fps }) => {
  const frame = useCurrentFrame();
  const progress = frame / (durationSec * fps);

  const opacity = interpolate(progress, [0, 0.08, 0.92, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideIn = interpolate(progress, [0, 0.12], [50, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const quoteOpacity = interpolate(progress, [0.15, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const detailsOpacity = interpolate(progress, [0.25, 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle floating effect
  const floatY = interpolate(progress, [0, 0.5, 1], [0, -5, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 1400,
          transform: `translateX(${slideIn}px) translateY(${floatY}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: colors.text,
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: -2,
            }}
          >
            {lab}
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "white",
              backgroundColor: colors.accent,
              padding: "10px 32px",
              borderRadius: 10,
            }}
          >
            {rating}
          </div>
        </div>

        <div
          style={{
            width: 100,
            height: 3,
            backgroundColor: colors.accent,
            marginTop: 35,
            marginBottom: 35,
          }}
        />

        <div
          style={{
            fontSize: 40,
            fontWeight: 400,
            color: colors.text,
            fontFamily: "Inter, system-ui, sans-serif",
            fontStyle: "italic",
            opacity: quoteOpacity,
            transform: `translateY(${interpolate(quoteOpacity, [0, 1], [15, 0])}px)`,
          }}
        >
          "{quote}"
        </div>

        <div
          style={{
            fontSize: 28,
            color: colors.textMuted,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 25,
            opacity: detailsOpacity,
            transform: `translateY(${interpolate(detailsOpacity, [0, 1], [10, 0])}px)`,
          }}
        >
          {details}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Rankings slide with staggered reveal
const RankingsSlide: React.FC<{ durationSec: number; fps: number }> = ({ durationSec, fps }) => {
  const frame = useCurrentFrame();
  const progress = frame / (durationSec * fps);

  const opacity = interpolate(progress, [0, 0.05, 0.95, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fixed order per user request
  const rankings = ["Claude Opus 4.5", "GPT 5.2", "Gemini 3 Pro", "GLM 4.7"];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: colors.text,
            fontFamily: "Inter, system-ui, sans-serif",
            marginBottom: 50,
            letterSpacing: -2,
          }}
        >
          My Top 4 Models
        </div>

        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: colors.accent,
            marginBottom: 45,
          }}
        />

        {rankings.map((model, i) => {
          const itemProgress = interpolate(
            progress,
            [0.1 + i * 0.08, 0.18 + i * 0.08],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const slideX = interpolate(itemProgress, [0, 1], [-40, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                fontSize: 44,
                fontWeight: 600,
                color: colors.text,
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 22,
                opacity: itemProgress,
                transform: `translateX(${slideX}px)`,
              }}
            >
              <span
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: colors.accent,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <span>{model}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// CTA slide
const CTASlide: React.FC<{ durationSec: number; fps: number }> = ({ durationSec, fps }) => {
  const frame = useCurrentFrame();
  const progress = frame / (durationSec * fps);

  const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(progress, [0, 0.15], [0.96, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: colors.text,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: -1,
          }}
        >
          Read the full article
        </div>

        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: colors.bg,
            backgroundColor: colors.accent,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 35,
            padding: "18px 45px",
            borderRadius: 10,
          }}
        >
          adamholter.substack.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SubstackVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Audio tracks for each segment */}
      <Sequence from={Math.round(STARTS.intro * fps)}>
        <Audio src={staticFile("audio/intro.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.landscape * fps)}>
        <Audio src={staticFile("audio/landscape.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.anthropic * fps)}>
        <Audio src={staticFile("audio/anthropic.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.google * fps)}>
        <Audio src={staticFile("audio/google.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.openai * fps)}>
        <Audio src={staticFile("audio/openai.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.xai * fps)}>
        <Audio src={staticFile("audio/xai.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.chinese * fps)}>
        <Audio src={staticFile("audio/chinese.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.meta * fps)}>
        <Audio src={staticFile("audio/meta.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.tiers * fps)}>
        <Audio src={staticFile("audio/tiers.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.topModels * fps)}>
        <Audio src={staticFile("audio/top-models.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.overview * fps)}>
        <Audio src={staticFile("audio/overview.wav")} />
      </Sequence>
      <Sequence from={Math.round(STARTS.cta * fps)}>
        <Audio src={staticFile("audio/cta.wav")} />
      </Sequence>

      {/* Visual segments */}

      {/* 1. Intro/Title */}
      <Sequence
        from={Math.round(STARTS.intro * fps)}
        durationInFrames={Math.round(DURATIONS.intro * fps)}
      >
        <TitleSlide durationSec={DURATIONS.intro} fps={fps} />
      </Sequence>

      {/* 2. Landscape - Show the open/closed models grid */}
      <Sequence
        from={Math.round(STARTS.landscape * fps)}
        durationInFrames={Math.round(DURATIONS.landscape * fps)}
      >
        <Image3DSlide
          imageSrc="llm-landscape.png"
          title="The Landscape"
          subtitle="Closed-source vs Open-weight models"
          durationSec={DURATIONS.landscape}
          fps={fps}
          effect="zoomIn"
        />
      </Sequence>

      {/* 3. Anthropic */}
      <Sequence
        from={Math.round(STARTS.anthropic * fps)}
        durationInFrames={Math.round(DURATIONS.anthropic * fps)}
      >
        <LabTextSlide
          lab="Anthropic"
          rating="A+"
          quote="Opus is incredible"
          details="Claude Code & Chrome are excellent developer tools"
          durationSec={DURATIONS.anthropic}
          fps={fps}
        />
      </Sequence>

      {/* 4. Google */}
      <Sequence
        from={Math.round(STARTS.google * fps)}
        durationInFrames={Math.round(DURATIONS.google * fps)}
      >
        <LabTextSlide
          lab="Google"
          rating="A-"
          quote="Resurgence with Gemini 3"
          details="Impressive multimodal, but language reliability issues"
          durationSec={DURATIONS.google}
          fps={fps}
        />
      </Sequence>

      {/* 5. OpenAI */}
      <Sequence
        from={Math.round(STARTS.openai * fps)}
        durationInFrames={Math.round(DURATIONS.openai * fps)}
      >
        <LabTextSlide
          lab="OpenAI"
          rating="B+"
          quote="No longer my default choice"
          details="Superior for STEM, but UI capabilities lag behind"
          durationSec={DURATIONS.openai}
          fps={fps}
        />
      </Sequence>

      {/* 6. xAI */}
      <Sequence
        from={Math.round(STARTS.xai * fps)}
        durationInFrames={Math.round(DURATIONS.xai * fps)}
      >
        <LabTextSlide
          lab="xAI"
          rating="B"
          quote="Cost efficiency focus"
          details="Grok 4 Fast • Grok 4.20 promising for UI"
          durationSec={DURATIONS.xai}
          fps={fps}
        />
      </Sequence>

      {/* 7. Chinese Labs */}
      <Sequence
        from={Math.round(STARTS.chinese * fps)}
        durationInFrames={Math.round(DURATIONS.chinese * fps)}
      >
        <LabTextSlide
          lab="Chinese Labs"
          rating="A-"
          quote="The poor man's Opus"
          details="GLM 4.7 from Zhipu • ByteDance Seedream"
          durationSec={DURATIONS.chinese}
          fps={fps}
        />
      </Sequence>

      {/* 8. Meta */}
      <Sequence
        from={Math.round(STARTS.meta * fps)}
        durationInFrames={Math.round(DURATIONS.meta * fps)}
      >
        <LabTextSlide
          lab="Llama"
          rating="F"
          quote="Total joke"
          details="Avoid it"
          durationSec={DURATIONS.meta}
          fps={fps}
        />
      </Sequence>

      {/* 9. Tier List - Show the 80/20 tier ranking image */}
      <Sequence
        from={Math.round(STARTS.tiers * fps)}
        durationInFrames={Math.round(DURATIONS.tiers * fps)}
      >
        <Image3DSlide
          imageSrc="top-models.png"
          title="Tier List"
          subtitle="Great models 80% of the time • Decent for specialized tasks • Trash"
          durationSec={DURATIONS.tiers}
          fps={fps}
          effect="panLeft"
        />
      </Sequence>

      {/* 10. Top 4 Models - Show the detailed model cards */}
      <Sequence
        from={Math.round(STARTS.topModels * fps)}
        durationInFrames={Math.round(DURATIONS.topModels * fps)}
      >
        <Image3DSlide
          imageSrc="model-tiers.png"
          title="Top 4 in Detail"
          durationSec={DURATIONS.topModels}
          fps={fps}
          effect="zoomOut"
        />
      </Sequence>

      {/* 11. Overview - Show all models grid */}
      <Sequence
        from={Math.round(STARTS.overview * fps)}
        durationInFrames={Math.round(DURATIONS.overview * fps)}
      >
        <Image3DSlide
          imageSrc="all-models.png"
          title="All Models"
          subtitle="Complete ratings & observations"
          durationSec={DURATIONS.overview}
          fps={fps}
          effect="tiltUp"
        />
      </Sequence>

      {/* 12. CTA */}
      <Sequence
        from={Math.round(STARTS.cta * fps)}
        durationInFrames={Math.round(DURATIONS.cta * fps)}
      >
        <CTASlide durationSec={DURATIONS.cta} fps={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};
