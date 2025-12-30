# Qwen: Qwen3 Vl 8b Instruct Analysis

**Type:** openrouter
**Generated:** 2025-10-14 13:43:57

---

## Model Overview

The model is named **Qwen: Qwen3 Vl 8b Instruct**, created by the vendor **Qwen** (associated with Alibaba). It falls into the category of multimodal vision-language models, specifically from the Qwen3-VL series, as detailed in the OpenRouter Catalogue dataset. This series emphasizes high-fidelity understanding and reasoning across text, images, and video inputs.

Key specifications include:
- **Context Length**: 256,000 tokens natively, extensible to 1 million tokens.
- **Capabilities**: Built for tasks involving multimodal fusion, such as Interleaved-MRoPE for long-horizon temporal reasoning, DeepStack for fine-grained visual-text alignment, and text-timestamp alignment for precise event localization. It handles static and dynamic media inputs, supporting document parsing, visual question answering (VQA), spatial reasoning, and GUI control. The model achieves text understanding comparable to leading large language models (LLMs) while expanding OCR coverage to 32 languages and improving robustness under varied visual conditions.
- **Creation Date**: Timestamp 1760463308 (indicating a recent release, consistent with other Qwen models from mid-2025 in the dataset).
- No instruct_type is specified, but it is positioned as an instruct-tuned variant optimized for instruction-following in multimodal contexts.

This model is part of a broader trend in the OpenRouter Catalogue toward multimodal (text+image) models, as highlighted in the structured dataset summary.

## Performance Analysis

Specific benchmark scores for Qwen: Qwen3 Vl 8b Instruct are not present in the provided datasets. The model's description references competitive performance on multimodal benchmarks for perception and reasoning (e.g., real-world/synthetic category recognition, 2D/3D spatial grounding, and long-form visual comprehension), but no numerical metrics like MMLU-Pro, GPQA, or Math Index are detailed for this exact 8B variant.

Comparisons with similar models (drawn solely from the provided data):
- Within the Qwen family: It shares a 256K context length with Qwen: Qwen3 Max (also from Qwen, noted for improved reasoning, instruction following, and multilingual support). Larger Qwen3-VL siblings like Qwen3 VL 30B A3B Instruct/Thinking and Qwen3 VL 235B A22B Instruct/Thinking offer similar multimodal capabilities but with expanded parameters (30B/235B) and slightly longer native contexts (262,144 tokens for 30B variants). These larger models are described as achieving "competitive multimodal benchmark results" in perception and agentic tasks, implying the 8B version may be a lighter, efficiency-focused option.
- Broader context: In the OpenRouter Catalogue, multimodal trends include models like Google: Gemini 2.5 Flash (text+image->text+image, 32K context) and OpenAI: GPT-5 Pro (text+image->text, 400K context), which emphasize agentic workflows. The Artificial Analysis â LLMs dataset does not list Qwen models among top performers (dominated by OpenAI's GPT-5 variants and o3, with Intelligence Indices up to 68.5 and Math Indices up to 94.3). Meta's Llama 3.1 Instruct 405B scores 0.732 on MMLU-Pro and 0.515 on GPQA, providing a baseline for large open models, but no direct head-to-head with Qwen3-VL-8B.
- Highlights from the structured summary note Qwen's emphasis on long context windows (up to 1M extensible) and agentic capabilities, aligning it with trends in models like Anthropic: Claude Sonnet 4.5 (1M context, optimized for coding/agent workflows).

Overall, while the data positions Qwen3-VL-8B as robust for multimodal tasks, quantitative comparisons are limited; it appears suited for mid-tier performance in vision-language reasoning compared to flagship text-only models like GPT-5.

## Technical Details

Architecture insights from the data:
- **Modality and Modalities**: Text+image -> text. Input modalities include image and text; output is text-only. It uses the Qwen3 tokenizer, with no specified instruct_type.
- **Key Features**: Improved multimodal fusion via Interleaved-MRoPE (for temporal reasoning over long sequences), DeepStack (for visual-text alignment), and text-timestamp alignment (for event localization in videos). The model processes both static images and dynamic videos, supporting tasks like multi-image multi-turn instructions and GUI automation.
- **Context and Limits**: Native 256K-token window, extensible to 1M tokens. Top provider details: 256,000 context length, maximum completion tokens of 32,768, and it is not moderated.
- **Supported Parameters**: Includes max_tokens, presence_penalty, response_format, seed, temperature, tool_choice, tools, and top_p. Default parameters are temperature: 0.7 and top_p: 0.8 (frequency_penalty: null).
- **Other Specs**: No per-request limits specified. Pricing breakdown includes zero cost for image inputs, web_search, internal_reasoning, and requests, indicating efficiency for multimodal prompts.

The data does not provide deeper details on parameter count (beyond the 8B implication in the name), training data, or exact layer structure, but it highlights efficiency for fine-grained alignment and robustness in varied visual conditions.

## Pricing & Availability

- **Cost Structure**: Highly affordable, with prompt pricing at $0.00000018 per token and completion at $0.0000007 per token. Image inputs, requests, web_search, and internal_reasoning are free ($0). This positions it as a low-cost option for multimodal inference, especially compared to text-heavy models like OpenAI: GPT-5 Pro (prompt: $0.000015, completion: $0.00012). No blended pricing or tiers are detailed, but the structure favors high-volume, image-inclusive use cases.
- **Availability and Access**: Accessible via OpenRouter (display URL: https://openrouter.ai/models/qwen/qwen3-vl-8b-instruct). Hugging Face ID: Qwen/Qwen3-VL-8B-Instruct, suggesting open-weight availability for local deployment. It is listed in the OpenRouter Catalogue alongside 49 other models, with no per-request limits. As part of the Qwen ecosystem, it integrates with standard API parameters for tools and reasoning, though not explicitly moderated.

No additional tiers (e.g., free vs. paid variants) or regional restrictions are mentioned in the data.

## Use Cases & Applications

Based on the performance data and description:
- **Recommended Applications**: Ideal for document AI (e.g., parsing with OCR in 32 languages), visual question answering, spatial reasoning (2D/3D grounding), and GUI control/automation. It supports agentic workflows like multi-turn image interactions, video timeline alignment, and visual coding (e.g., from sketches to UI debugging). The long context (256K+) suits long-form visual comprehension and temporal reasoning in videos. Text capabilities match leading LLMs, making it versatile for hybrid text-vision tasks like multilingual translation with images or robust analysis under noisy visual conditions.
- **Strengths**: Cost-efficiency for multimodal inputs (free image processing), broad OCR support, and extensible context for complex, long-horizon tasks. Aligns with dataset trends toward vision-language agents, similar to Qwen3-VL larger variants for production scenarios like software/UI assistance and embodied tasks.
- **Limitations**: As an 8B model, it may underperform larger siblings (e.g., 235B variants) on highly complex reasoning, per implicit scaling in the Qwen series. No explicit support for audio or output images (text-only output). Benchmarks are absent, so exact limits in math/coding (e.g., compared to GPT-5's 94.3 Math Index) are unknown. Tool_choice and tools are supported, but no data on agentic benchmark scores like Tau2 (where top models score 0.8+).

The data emphasizes its suitability for research and production in document AI, OCR, and spatial tasks, but notes no evaluation on non-visual domains like pure coding.

## Community & Updates

- **Recent Developments or Updates**: Created at timestamp 1760463308, placing it among mid-2025 releases in the OpenRouter dataset (e.g., after Qwen3 Max at 1758662808). It is part of the Qwen3-VL series, which introduces advancements like improved multimodal fusion over prior versions. The structured summary highlights Qwen's push toward long contexts (up to 1M extensible) and hybrid reasoning modes in variants like Qwen3 VL 30B A3B Thinking, suggesting ongoing evolution in the family. No specific update history for this model is detailed.
- **User Feedback and Adoption**: No direct user feedback or adoption metrics are present in the datasets. However, the OpenRouter Catalogue positions it within a diverse ecosystem (50 models, including free options), and highlights note Qwen's emphasis on agentic capabilities, implying growing interest in multimodal models from providers like Qwen, Baidu, and Google. Larger Qwen variants (e.g., Qwen3 Max) are listed as top items for reasoning/multilingual support, indicating broader series adoption.

Information on community engagement, such as GitHub stars or forum discussions, is not present in the provided datasets.

---

## Dataset Context

{
  "categories": [
    {
      "id": "openrouter",
      "label": "OpenRouter Catalogue",
      "items": 50,
      "source": "openrouter"
    },
    {
      "id": "llms",
      "label": "Artificial Analysis — LLMs",
      "items": 30,
      "source": "artificial-analysis"
    }
  ],
  "structured": {
    "category_summaries": [
      {
        "id": "openrouter",
        "label": "OpenRouter Catalogue",
        "summary": "The OpenRouter catalogue features 50 models from various vendors, including Qwen, Google, Baidu, NVIDIA, DeepSeek, Anthropic, OpenAI, and others, showcasing a range of modalities (text, image, audio) and specialization levels (Instruct, Thinking, Coder). Context lengths vary widely, up to 1,000,000 tokens for some models, and pricing structures are diverse, with some models offered for free.",
        "top_items": [
          {
            "name": "Qwen: Qwen3 Max",
            "provider": "Qwen",
            "key_metrics": {
              "context_length": "256000"
            },
            "notes": "Offers improved reasoning, instruction following, and multilingual support compared to older Qwen3 versions."
          },
          {
            "name": "Anthropic: Claude Sonnet 4.5",
            "provider": "Anthropic",
            "key_metrics": {
              "context_length": "1000000"
            },
            "notes": "Optimized for real-world agents and coding workflows, delivering state-of-the-art performance on coding benchmarks."
          },
          {
            "name": "OpenAI: GPT-5 Pro",
            "provider": "OpenAI",
            "key_metrics": {
              "context_length": "400000"
            },
            "notes": "OpenAI’s most advanced model, optimized for complex tasks requiring step-by-step reasoning and instruction following."
          }
        ]
      },
      {
        "id": "llms",
        "label": "Artificial Analysis — LLMs",
        "summary": "This collection of 30 LLMs, primarily from OpenAI, Meta, and Google, covers models with varying performance tiers, from high-end proprietary models like GPT-5 variants to open models like Llama 4 Scout. The leading model, 'o3', achieves an Intelligence Index of 65.5 and a Math Index of 88.3, while performance across the board is heterogeneous.",
        "top_items": [
          {
            "name": "o3",
            "provider": "OpenAI",
            "key_metrics": {
              "artificial_analysis_intelligence_index": "65.5",
              "artificial_analysis_math_index": "88.3"
            },
            "notes": "Achieves the highest reported Intelligence Index (65.5) and Math Index (88.3) among the listed LLMs."
          },
          {
            "name": "GPT-5 (high)",
            "provider": "OpenAI",
            "key_metrics": {
              "artificial_analysis_intelligence_index": "68.5",
              "artificial_analysis_math_index": "94.3"
            },
            "notes": "Has the highest recorded Intelligence Index (68.5) among all models in this set."
          },
          {
            "name": "Llama 3.1 Instruct 405B",
            "provider": "Meta",
            "key_metrics": {
              "mmlu_pro": "0.732",
              "gpqa": "0.515"
            },
            "notes": "A large model from Meta with a 131072 context length (implied via open router, but not explicitly listed in LLMs schema)."
          }
        ]
      }
    ],
    "highlights": [
      "The OpenRouter dataset showcases models incorporating advanced AI concepts such as 'Thinking' (explicit internal reasoning traces) and specialized modalities like vision-language (VL) capabilities.",
      "In the LLMs category, OpenAI's proprietary models, particularly 'GPT-5 (high)' and 'o3', dominate the performance benchmarks across Intelligence, Coding, and Math indices.",
      "Several models from Qwen, Baidu, and Google published in the OpenRouter dataset emphasize long context windows (up to 1M or 2M tokens) and agentic capabilities.",
      "NVIDIA's Nemotron models and DeepSeek V3.1 utilize adjustable reasoning modes, a pattern mirrored by meta-models like Nous Hermes 4, indicating reasoning control is a key feature trend."
    ],
    "markdown_summary": "# Summary of Extracted Structured Data\n\nThis analysis covers two distinct datasets: the **OpenRouter Catalogue** (50 entries) detailing available LLMs and their technical specifications, and the **Artificial Analysis — LLMs** set (30 entries), focusing on performance metrics like the Intelligence Index.\n\n## OpenRouter Catalogue\n\nThe OpenRouter catalogue is rich with cutting-edge models from providers like Qwen, Google, Baidu, NVIDIA, and DeepSeek. Key trends include the proliferation of **multimodal (text+image) models** (e.g., Qwen3-VL series, Gemini 2.5 Flash) and models explicitly offering **hybrid reasoning modes** (e.g., Qwen Thinking variants, Hermes 4). Context lengths are increasingly large, extending up to 1M tokens for some models (e.g., **Anthropic: Claude Sonnet 4.5** and **Qwen: Qwen Plus 0728**).\n\n**Notable OpenRouter Models:**\n*   **Anthropic: Claude Sonnet 4.5:** High context (1,000,000 tokens) and optimized for coding/agent workflows.\n*   **Qwen: Qwen3 Max:** Improved reasoning and multilingual support with 256K context.\n*   **xAI: Grok 4 Fast:** Features a massive 2M token context window.\n\n## Artificial Analysis — LLMs\n\nThis section benchmarks 30 models, primarily focusing on reasoning and coding abilities. The performance hierarchy is clearly led by OpenAI's versions of GPT-5.\n\n**Top Performing Models (LLMs Dataset):\n**\n*   **GPT-5 (high):** Claims the highest performance metrics across the board, with an Intelligence Index of **68.5** and a Math Index of **94.3**.\n*   **o3 (OpenAI):** Shows exceptional results, particularly in math (**88.3 Math Index**) and high MMLU Pro scores (**0.853**).\n*   **Open Source Models:** Meta's **Llama 3.1 Instruct 405B** shows competitive performance among the larger non-OpenAI releases, scoring **0.732** on MMLU Pro.\n\nOverall, the data highlights a strong push toward longer context windows and explicit control over internal reasoning across the major LLM providers.",
    "_model_id": "google/gemini-2.5-flash-lite-preview-09-2025",
    "_raw_length": 5771
  },
  "datasets": {
    "openrouter": [
      {
        "id": "qwen/qwen3-vl-8b-instruct",
        "slug": "qwen/qwen3-vl-8b-instruct",
        "name": "Qwen: Qwen3 Vl 8b Instruct",
        "vendor": "Qwen",
        "base_name": "Qwen3 Vl 8b Instruct",
        "created": 1760463308,
        "description": "Qwen3-VL-8B-Instruct is a multimodal vision-language model from the Qwen3-VL series, built for high-fidelity understanding and reasoning across text, images, and video. It features improved multimodal fusion with Interleaved-MRoPE for long-horizon temporal reasoning, DeepStack for fine-grained visual-text alignment, and text-timestamp alignment for precise event localization.\n\nThe model supports a native 256K-token context window, extensible to 1M tokens, and handles both static and dynamic media inputs for tasks like document parsing, visual question answering, spatial reasoning, and GUI control. It achieves text understanding comparable to leading LLMs while expanding OCR coverage to 32 languages and enhancing robustness under varied visual conditions.",
        "context_length": 256000,
        "hugging_face_id": "Qwen/Qwen3-VL-8B-Instruct",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "image",
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000018",
          "completion": "0.0000007",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 256000,
          "max_completion_tokens": 32768,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.7,
          "top_p": 0.8,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-vl-8b-instruct"
      },
      {
        "id": "inclusionai/ling-1t",
        "slug": "inclusionai/ling-1t",
        "name": "inclusionAI: Ling-1T",
        "vendor": "inclusionAI",
        "base_name": "Ling-1T",
        "created": 1760316076,
        "description": "Ling-1T is a trillion-parameter open-weight large language model developed by inclusionAI and released under the MIT license. It represents the first flagship non-thinking model in the Ling 2.0 series, built around a sparse-activation architecture with roughly 50 billion active parameters per token. The model supports up to 128 K tokens of context and emphasizes efficient reasoning through an “Evolutionary Chain-of-Thought (Evo-CoT)” training strategy.\n\nPre-trained on more than 20 trillion reasoning-dense tokens, Ling-1T achieves strong results across code generation, mathematics, and logical reasoning benchmarks while maintaining high inference efficiency. It employs FP8 mixed-precision training, MoE routing with QK normalization, and MTP layers for compositional reasoning stability. The model also introduces LPO (Linguistics-unit Policy Optimization) for post-training alignment, enhancing sentence-level semantic control.\n\nLing-1T can perform complex text generation, multilingual reasoning, and front-end code synthesis with a focus on both functionality and aesthetics.",
        "context_length": 131072,
        "hugging_face_id": "inclusionAI/Ling-1T",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.000001",
          "completion": "0.000003",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.7,
          "top_p": 0.8,
          "frequency_penalty": 1.05
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/inclusionai/ling-1t"
      },
      {
        "id": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "slug": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "name": "NVIDIA: Llama 3.3 Nemotron Super 49B V1.5",
        "vendor": "NVIDIA",
        "base_name": "Llama 3.3 Nemotron Super 49B V1.5",
        "created": 1760101395,
        "description": "Llama-3.3-Nemotron-Super-49B-v1.5 is a 49B-parameter, English-centric reasoning/chat model derived from Meta’s Llama-3.3-70B-Instruct with a 128K context. It’s post-trained for agentic workflows (RAG, tool calling) via SFT across math, code, science, and multi-turn chat, followed by multiple RL stages; Reward-aware Preference Optimization (RPO) for alignment, RL with Verifiable Rewards (RLVR) for step-wise reasoning, and iterative DPO to refine tool-use behavior. A distillation-driven Neural Architecture Search (“Puzzle”) replaces some attention blocks and varies FFN widths to shrink memory footprint and improve throughput, enabling single-GPU (H100/H200) deployment while preserving instruction following and CoT quality.\n\nIn internal evaluations (NeMo-Skills, up to 16 runs, temp = 0.6, top_p = 0.95), the model reports strong reasoning/coding results, e.g., MATH500 pass@1 = 97.4, AIME-2024 = 87.5, AIME-2025 = 82.71, GPQA = 71.97, LiveCodeBench (24.10–25.02) = 73.58, and MMLU-Pro (CoT) = 79.53. The model targets practical inference efficiency (high tokens/s, reduced VRAM) with Transformers/vLLM support and explicit “reasoning on/off” modes (chat-first defaults, greedy recommended when disabled). Suitable for building agents, assistants, and long-context retrieval systems where balanced accuracy-to-cost and reliable tool use matter.\n",
        "context_length": 131072,
        "hugging_face_id": "nvidia/Llama-3_3-Nemotron-Super-49B-v1_5",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Llama3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000001",
          "completion": "0.0000004",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": null,
        "tags": [],
        "display_url": "https://openrouter.ai/models/nvidia/llama-3.3-nemotron-super-49b-v1.5"
      },
      {
        "id": "baidu/ernie-4.5-21b-a3b-thinking",
        "slug": "baidu/ernie-4.5-21b-a3b-thinking",
        "name": "Baidu: ERNIE 4.5 21B A3B Thinking",
        "vendor": "Baidu",
        "base_name": "ERNIE 4.5 21B A3B Thinking",
        "created": 1760048887,
        "description": "ERNIE-4.5-21B-A3B-Thinking is Baidu's upgraded lightweight MoE model, refined to boost reasoning depth and quality for top-tier performance in logical puzzles, math, science, coding, text generation, and expert-level academic benchmarks.",
        "context_length": 131072,
        "hugging_face_id": "baidu/ERNIE-4.5-21B-A3B-Thinking",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000007",
          "completion": "0.00000028",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 65536,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "max_tokens",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "seed",
          "stop",
          "temperature",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.6,
          "top_p": 0.95,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/baidu/ernie-4.5-21b-a3b-thinking"
      },
      {
        "id": "google/gemini-2.5-flash-image",
        "slug": "google/gemini-2.5-flash-image",
        "name": "Google: Gemini 2.5 Flash Image (Nano Banana)",
        "vendor": "Google",
        "base_name": "Gemini 2.5 Flash Image (Nano Banana)",
        "created": 1759870431,
        "description": "Gemini 2.5 Flash Image, a.k.a. \"Nano Banana,\" is now generally available. It is a state of the art image generation model with contextual understanding. It is capable of image generation, edits, and multi-turn conversations. Aspect ratios can be controlled with the [image_config API Parameter](https://openrouter.ai/docs/features/multimodal/image-generation#image-aspect-ratio-configuration)",
        "context_length": 32768,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text+image",
          "input_modalities": [
            "image",
            "text"
          ],
          "output_modalities": [
            "image",
            "text"
          ],
          "tokenizer": "Gemini",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000025",
          "request": "0",
          "image": "0.001238",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 32768,
          "max_completion_tokens": 8192,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "response_format",
          "seed",
          "structured_outputs",
          "temperature",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/google/gemini-2.5-flash-image"
      },
      {
        "id": "qwen/qwen3-vl-30b-a3b-thinking",
        "slug": "qwen/qwen3-vl-30b-a3b-thinking",
        "name": "Qwen: Qwen3 VL 30B A3B Thinking",
        "vendor": "Qwen",
        "base_name": "Qwen3 VL 30B A3B Thinking",
        "created": 1759794479,
        "description": "Qwen3-VL-30B-A3B-Thinking is a multimodal model that unifies strong text generation with visual understanding for images and videos. Its Thinking variant enhances reasoning in STEM, math, and complex tasks. It excels in perception of real-world/synthetic categories, 2D/3D spatial grounding, and long-form visual comprehension, achieving competitive multimodal benchmark results. For agentic use, it handles multi-image multi-turn instructions, video timeline alignments, GUI automation, and visual coding from sketches to debugged UI. Text performance matches flagship Qwen3 models, suiting document AI, OCR, UI assistance, spatial tasks, and agent research.",
        "context_length": 262144,
        "hugging_face_id": "Qwen/Qwen3-VL-30B-A3B-Thinking",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000029",
          "completion": "0.000001",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": 262144,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.8,
          "top_p": 0.95
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-vl-30b-a3b-thinking"
      },
      {
        "id": "qwen/qwen3-vl-30b-a3b-instruct",
        "slug": "qwen/qwen3-vl-30b-a3b-instruct",
        "name": "Qwen: Qwen3 VL 30B A3B Instruct",
        "vendor": "Qwen",
        "base_name": "Qwen3 VL 30B A3B Instruct",
        "created": 1759794476,
        "description": "Qwen3-VL-30B-A3B-Instruct is a multimodal model that unifies strong text generation with visual understanding for images and videos. Its Instruct variant optimizes instruction-following for general multimodal tasks. It excels in perception of real-world/synthetic categories, 2D/3D spatial grounding, and long-form visual comprehension, achieving competitive multimodal benchmark results. For agentic use, it handles multi-image multi-turn instructions, video timeline alignments, GUI automation, and visual coding from sketches to debugged UI. Text performance matches flagship Qwen3 models, suiting document AI, OCR, UI assistance, spatial tasks, and agent research.",
        "context_length": 262144,
        "hugging_face_id": "Qwen/Qwen3-VL-30B-A3B-Instruct",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000029",
          "completion": "0.000001",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": 262144,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.7,
          "top_p": 0.8
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-vl-30b-a3b-instruct"
      },
      {
        "id": "openai/gpt-5-pro",
        "slug": "openai/gpt-5-pro-2025-10-06",
        "name": "OpenAI: GPT-5 Pro",
        "vendor": "OpenAI",
        "base_name": "GPT-5 Pro",
        "created": 1759776663,
        "description": "GPT-5 Pro is OpenAI’s most advanced model, offering major improvements in reasoning, code quality, and user experience. It is optimized for complex tasks that require step-by-step reasoning, instruction following, and accuracy in high-stakes use cases. It supports test-time routing features and advanced prompt understanding, including user-specified intent like \"think hard about this.\" Improvements include reductions in hallucination, sycophancy, and better performance in coding, writing, and health-related tasks.",
        "context_length": 400000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "image",
            "text",
            "file"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "GPT",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.000015",
          "completion": "0.00012",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 400000,
          "max_completion_tokens": 128000,
          "is_moderated": true
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "reasoning",
          "response_format",
          "seed",
          "structured_outputs",
          "tool_choice",
          "tools"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/openai/gpt-5-pro-2025-10-06"
      },
      {
        "id": "z-ai/glm-4.6",
        "slug": "z-ai/glm-4.6",
        "name": "Z.AI: GLM 4.6",
        "vendor": "Z.AI",
        "base_name": "GLM 4.6",
        "created": 1759235576,
        "description": "Compared with GLM-4.5, this generation brings several key improvements:\n\nLonger context window: The context window has been expanded from 128K to 200K tokens, enabling the model to handle more complex agentic tasks.\nSuperior coding performance: The model achieves higher scores on code benchmarks and demonstrates better real-world performance in applications such as Claude Code、Cline、Roo Code and Kilo Code, including improvements in generating visually polished front-end pages.\nAdvanced reasoning: GLM-4.6 shows a clear improvement in reasoning performance and supports tool use during inference, leading to stronger overall capability.\nMore capable agents: GLM-4.6 exhibits stronger performance in tool using and search-based agents, and integrates more effectively within agent frameworks.\nRefined writing: Better aligns with human preferences in style and readability, and performs more naturally in role-playing scenarios.",
        "context_length": 202752,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000005",
          "completion": "0.00000175",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 202752,
          "max_completion_tokens": 202752,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_a",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.6,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/z-ai/glm-4.6"
      },
      {
        "id": "anthropic/claude-sonnet-4.5",
        "slug": "anthropic/claude-4.5-sonnet-20250929",
        "name": "Anthropic: Claude Sonnet 4.5",
        "vendor": "Anthropic",
        "base_name": "Claude Sonnet 4.5",
        "created": 1759161676,
        "description": "Claude Sonnet 4.5 is Anthropic’s most advanced Sonnet model to date, optimized for real-world agents and coding workflows. It delivers state-of-the-art performance on coding benchmarks such as SWE-bench Verified, with improvements across system design, code security, and specification adherence. The model is designed for extended autonomous operation, maintaining task continuity across sessions and providing fact-based progress tracking.\n\nSonnet 4.5 also introduces stronger agentic capabilities, including improved tool orchestration, speculative parallel execution, and more efficient context and memory management. With enhanced context tracking and awareness of token usage across tool calls, it is particularly well-suited for multi-context and long-running workflows. Use cases span software engineering, cybersecurity, financial analysis, research agents, and other domains requiring sustained reasoning and tool use.",
        "context_length": 1000000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image",
            "file"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Claude",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.000003",
          "completion": "0.000015",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 1000000,
          "max_completion_tokens": 64000,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "reasoning",
          "stop",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 1,
          "top_p": 1,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/anthropic/claude-4.5-sonnet-20250929"
      },
      {
        "id": "deepseek/deepseek-v3.2-exp",
        "slug": "deepseek/deepseek-v3.2-exp",
        "name": "DeepSeek: DeepSeek V3.2 Exp",
        "vendor": "DeepSeek",
        "base_name": "DeepSeek V3.2 Exp",
        "created": 1759150481,
        "description": "DeepSeek-V3.2-Exp is an experimental large language model released by DeepSeek as an intermediate step between V3.1 and future architectures. It introduces DeepSeek Sparse Attention (DSA), a fine-grained sparse attention mechanism designed to improve training and inference efficiency in long-context scenarios while maintaining output quality. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)\n\nThe model was trained under conditions aligned with V3.1-Terminus to enable direct comparison. Benchmarking shows performance roughly on par with V3.1 across reasoning, coding, and agentic tool-use tasks, with minor tradeoffs and gains depending on the domain. This release focuses on validating architectural optimizations for extended context lengths rather than advancing raw task accuracy, making it primarily a research-oriented model for exploring efficient transformer designs.",
        "context_length": 163840,
        "hugging_face_id": "deepseek-ai/DeepSeek-V3.2-Exp",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "DeepSeek",
          "instruct_type": "deepseek-v3.1"
        },
        "pricing": {
          "prompt": "0.00000027",
          "completion": "0.0000004",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 163840,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.6,
          "top_p": 0.95,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/deepseek/deepseek-v3.2-exp"
      },
      {
        "id": "thedrummer/cydonia-24b-v4.1",
        "slug": "thedrummer/cydonia-24b-v4.1",
        "name": "TheDrummer: Cydonia 24B V4.1",
        "vendor": "TheDrummer",
        "base_name": "Cydonia 24B V4.1",
        "created": 1758931878,
        "description": "Uncensored and creative writing model based on Mistral Small 3.2 24B with good recall, prompt adherence, and intelligence.",
        "context_length": 131072,
        "hugging_face_id": "thedrummer/cydonia-24b-v4.1",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000005",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "seed",
          "stop",
          "temperature",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/thedrummer/cydonia-24b-v4.1"
      },
      {
        "id": "relace/relace-apply-3",
        "slug": "relace/relace-apply-3",
        "name": "Relace: Relace Apply 3",
        "vendor": "Relace",
        "base_name": "Relace Apply 3",
        "created": 1758891572,
        "description": "Relace Apply 3 is a specialized code-patching LLM that merges AI-suggested edits straight into your source files. It can apply updates from GPT-4o, Claude, and others into your files at 7,500 tokens/sec on average.\n\nThe model requires the prompt to be in the following format: \n<instruction>{instruction}</instruction>\n<code>{initial_code}</code>\n<update>{edit_snippet}</update>\n\nZero Data Retention is enabled for Relace. Learn more about this model in their [documentation](https://docs.relace.ai/api-reference/instant-apply/apply)",
        "context_length": 256000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000085",
          "completion": "0.00000125",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 256000,
          "max_completion_tokens": 128000,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "seed",
          "stop"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/relace/relace-apply-3"
      },
      {
        "id": "google/gemini-2.5-flash-preview-09-2025",
        "slug": "google/gemini-2.5-flash-preview-09-2025",
        "name": "Google: Gemini 2.5 Flash Preview 09-2025",
        "vendor": "Google",
        "base_name": "Gemini 2.5 Flash Preview 09-2025",
        "created": 1758820178,
        "description": "Gemini 2.5 Flash Preview September 2025 Checkpoint is Google's state-of-the-art workhorse model, specifically designed for advanced reasoning, coding, mathematics, and scientific tasks. It includes built-in \"thinking\" capabilities, enabling it to provide responses with greater accuracy and nuanced context handling. \n\nAdditionally, Gemini 2.5 Flash is configurable through the \"max tokens for reasoning\" parameter, as described in the documentation (https://openrouter.ai/docs/use-cases/reasoning-tokens#max-tokens-for-reasoning).",
        "context_length": 1048576,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "image",
            "file",
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Gemini",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000025",
          "request": "0",
          "image": "0.001238",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.000000075",
          "input_cache_write": "0.0000003833"
        },
        "top_provider": {
          "context_length": 1048576,
          "max_completion_tokens": 65536,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "reasoning",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/google/gemini-2.5-flash-preview-09-2025"
      },
      {
        "id": "google/gemini-2.5-flash-lite-preview-09-2025",
        "slug": "google/gemini-2.5-flash-lite-preview-09-2025",
        "name": "Google: Gemini 2.5 Flash Lite Preview 09-2025",
        "vendor": "Google",
        "base_name": "Gemini 2.5 Flash Lite Preview 09-2025",
        "created": 1758819686,
        "description": "Gemini 2.5 Flash-Lite is a lightweight reasoning model in the Gemini 2.5 family, optimized for ultra-low latency and cost efficiency. It offers improved throughput, faster token generation, and better performance across common benchmarks compared to earlier Flash models. By default, \"thinking\" (i.e. multi-pass reasoning) is disabled to prioritize speed, but developers can enable it via the [Reasoning API parameter](https://openrouter.ai/docs/use-cases/reasoning-tokens) to selectively trade off cost for intelligence. ",
        "context_length": 1048576,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "file",
            "image",
            "text",
            "audio"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Gemini",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000001",
          "completion": "0.0000004",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 1048576,
          "max_completion_tokens": 65536,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "reasoning",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/google/gemini-2.5-flash-lite-preview-09-2025"
      },
      {
        "id": "qwen/qwen3-vl-235b-a22b-thinking",
        "slug": "qwen/qwen3-vl-235b-a22b-thinking",
        "name": "Qwen: Qwen3 VL 235B A22B Thinking",
        "vendor": "Qwen",
        "base_name": "Qwen3 VL 235B A22B Thinking",
        "created": 1758668690,
        "description": "Qwen3-VL-235B-A22B Thinking is a multimodal model that unifies strong text generation with visual understanding across images and video. The Thinking model is optimized for multimodal reasoning in STEM and math. The series emphasizes robust perception (recognition of diverse real-world and synthetic categories), spatial understanding (2D/3D grounding), and long-form visual comprehension, with competitive results on public multimodal benchmarks for both perception and reasoning.\n\nBeyond analysis, Qwen3-VL supports agentic interaction and tool use: it can follow complex instructions over multi-image, multi-turn dialogues; align text to video timelines for precise temporal queries; and operate GUI elements for automation tasks. The models also enable visual coding workflows, turning sketches or mockups into code and assisting with UI debugging, while maintaining strong text-only performance comparable to the flagship Qwen3 language models. This makes Qwen3-VL suitable for production scenarios spanning document AI, multilingual OCR, software/UI assistance, spatial/embodied tasks, and research on vision-language agents.",
        "context_length": 262144,
        "hugging_face_id": "Qwen/Qwen3-VL-235B-A22B-Thinking",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000045",
          "completion": "0.0000035",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": 262144,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.8,
          "top_p": 0.95,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-vl-235b-a22b-thinking"
      },
      {
        "id": "qwen/qwen3-vl-235b-a22b-instruct",
        "slug": "qwen/qwen3-vl-235b-a22b-instruct",
        "name": "Qwen: Qwen3 VL 235B A22B Instruct",
        "vendor": "Qwen",
        "base_name": "Qwen3 VL 235B A22B Instruct",
        "created": 1758668687,
        "description": "Qwen3-VL-235B-A22B Instruct is an open-weight multimodal model that unifies strong text generation with visual understanding across images and video. The Instruct model targets general vision-language use (VQA, document parsing, chart/table extraction, multilingual OCR). The series emphasizes robust perception (recognition of diverse real-world and synthetic categories), spatial understanding (2D/3D grounding), and long-form visual comprehension, with competitive results on public multimodal benchmarks for both perception and reasoning.\n\nBeyond analysis, Qwen3-VL supports agentic interaction and tool use: it can follow complex instructions over multi-image, multi-turn dialogues; align text to video timelines for precise temporal queries; and operate GUI elements for automation tasks. The models also enable visual coding workflows—turning sketches or mockups into code and assisting with UI debugging—while maintaining strong text-only performance comparable to the flagship Qwen3 language models. This makes Qwen3-VL suitable for production scenarios spanning document AI, multilingual OCR, software/UI assistance, spatial/embodied tasks, and research on vision-language agents.",
        "context_length": 131072,
        "hugging_face_id": "Qwen/Qwen3-VL-235B-A22B-Instruct",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000012",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.7,
          "top_p": 0.8,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-vl-235b-a22b-instruct"
      },
      {
        "id": "qwen/qwen3-max",
        "slug": "qwen/qwen3-max",
        "name": "Qwen: Qwen3 Max",
        "vendor": "Qwen",
        "base_name": "Qwen3 Max",
        "created": 1758662808,
        "description": "Qwen3-Max is an updated release built on the Qwen3 series, offering major improvements in reasoning, instruction following, multilingual support, and long-tail knowledge coverage compared to the January 2025 version. It delivers higher accuracy in math, coding, logic, and science tasks, follows complex instructions in Chinese and English more reliably, reduces hallucinations, and produces higher-quality responses for open-ended Q&A, writing, and conversation. The model supports over 100 languages with stronger translation and commonsense reasoning, and is optimized for retrieval-augmented generation (RAG) and tool calling, though it does not include a dedicated “thinking” mode.",
        "context_length": 256000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000012",
          "completion": "0.000006",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.00000024"
        },
        "top_provider": {
          "context_length": 256000,
          "max_completion_tokens": 32768,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-max"
      },
      {
        "id": "qwen/qwen3-coder-plus",
        "slug": "qwen/qwen3-coder-plus",
        "name": "Qwen: Qwen3 Coder Plus",
        "vendor": "Qwen",
        "base_name": "Qwen3 Coder Plus",
        "created": 1758662707,
        "description": "Qwen3 Coder Plus is Alibaba's proprietary version of the Open Source Qwen3 Coder 480B A35B. It is a powerful coding agent model specializing in autonomous programming via tool calling and environment interaction, combining coding proficiency with versatile general-purpose abilities.",
        "context_length": 128000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.000001",
          "completion": "0.000005",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.0000001"
        },
        "top_provider": {
          "context_length": 128000,
          "max_completion_tokens": 65536,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-coder-plus"
      },
      {
        "id": "openai/gpt-5-codex",
        "slug": "openai/gpt-5-codex",
        "name": "OpenAI: GPT-5 Codex",
        "vendor": "OpenAI",
        "base_name": "GPT-5 Codex",
        "created": 1758643403,
        "description": "GPT-5-Codex is a specialized version of GPT-5 optimized for software engineering and coding workflows. It is designed for both interactive development sessions and long, independent execution of complex engineering tasks. The model supports building projects from scratch, feature development, debugging, large-scale refactoring, and code review. Compared to GPT-5, Codex is more steerable, adheres closely to developer instructions, and produces cleaner, higher-quality code outputs. Reasoning effort can be adjusted with the `reasoning.effort` parameter. Read the [docs here](https://openrouter.ai/docs/use-cases/reasoning-tokens#reasoning-effort-level)\n\nCodex integrates into developer environments including the CLI, IDE extensions, GitHub, and cloud tasks. It adapts reasoning effort dynamically—providing fast responses for small tasks while sustaining extended multi-hour runs for large projects. The model is trained to perform structured code reviews, catching critical flaws by reasoning over dependencies and validating behavior against tests. It also supports multimodal inputs such as images or screenshots for UI development and integrates tool use for search, dependency installation, and environment setup. Codex is intended specifically for agentic coding applications.",
        "context_length": 400000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "GPT",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000125",
          "completion": "0.00001",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.000000125"
        },
        "top_provider": {
          "context_length": 400000,
          "max_completion_tokens": 128000,
          "is_moderated": true
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "reasoning",
          "response_format",
          "seed",
          "structured_outputs",
          "tool_choice",
          "tools"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/openai/gpt-5-codex"
      },
      {
        "id": "deepseek/deepseek-v3.1-terminus",
        "slug": "deepseek/deepseek-v3.1-terminus",
        "name": "DeepSeek: DeepSeek V3.1 Terminus",
        "vendor": "DeepSeek",
        "base_name": "DeepSeek V3.1 Terminus",
        "created": 1758548275,
        "description": "DeepSeek-V3.1 Terminus is an update to [DeepSeek V3.1](/deepseek/deepseek-chat-v3.1) that maintains the model's original capabilities while addressing issues reported by users, including language consistency and agent capabilities, further optimizing the model's performance in coding and search agents. It is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinking modes. It extends the DeepSeek-V3 base with a two-phase long-context training process, reaching up to 128K tokens, and uses FP8 microscaling for efficient inference. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)\n\nThe model improves tool use, code generation, and reasoning efficiency, achieving performance comparable to DeepSeek-R1 on difficult benchmarks while responding more quickly. It supports structured tool calling, code agents, and search agents, making it suitable for research, coding, and agentic workflows. ",
        "context_length": 163840,
        "hugging_face_id": "deepseek-ai/DeepSeek-V3.1-Terminus",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "DeepSeek",
          "instruct_type": "deepseek-v3.1"
        },
        "pricing": {
          "prompt": "0.00000023",
          "completion": "0.0000009",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 163840,
          "max_completion_tokens": 163840,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/deepseek/deepseek-v3.1-terminus"
      },
      {
        "id": "x-ai/grok-4-fast",
        "slug": "x-ai/grok-4-fast",
        "name": "xAI: Grok 4 Fast",
        "vendor": "xAI",
        "base_name": "Grok 4 Fast",
        "created": 1758240090,
        "description": "Grok 4 Fast is xAI's latest multimodal model with SOTA cost-efficiency and a 2M token context window. It comes in two flavors: non-reasoning and reasoning. Read more about the model on xAI's [news post](http://x.ai/news/grok-4-fast). Reasoning can be enabled using the `reasoning` `enabled` parameter in the API. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#controlling-reasoning-tokens)\n\nPrompts and completions on Grok 4 Fast Free may be used by xAI or OpenRouter to improve future models.",
        "context_length": 2000000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Grok",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000002",
          "completion": "0.0000005",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.00000005"
        },
        "top_provider": {
          "context_length": 2000000,
          "max_completion_tokens": 30000,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "logprobs",
          "max_tokens",
          "reasoning",
          "response_format",
          "seed",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/x-ai/grok-4-fast"
      },
      {
        "id": "alibaba/tongyi-deepresearch-30b-a3b:free",
        "slug": "alibaba/tongyi-deepresearch-30b-a3b",
        "name": "Tongyi DeepResearch 30B A3B (free)",
        "vendor": "Alibaba",
        "base_name": "Tongyi DeepResearch 30B A3B (free)",
        "created": 1758210804,
        "description": "Tongyi DeepResearch is an agentic large language model developed by Tongyi Lab, with 30 billion total parameters activating only 3 billion per token. It's optimized for long-horizon, deep information-seeking tasks and delivers state-of-the-art performance on benchmarks like Humanity's Last Exam, BrowserComp, BrowserComp-ZH, WebWalkerQA, GAIA, xbench-DeepSearch, and FRAMES. This makes it superior for complex agentic search, reasoning, and multi-step problem-solving compared to prior models.\n\nThe model includes a fully automated synthetic data pipeline for scalable pre-training, fine-tuning, and reinforcement learning. It uses large-scale continual pre-training on diverse agentic data to boost reasoning and stay fresh. It also features end-to-end on-policy RL with a customized Group Relative Policy Optimization, including token-level gradients and negative sample filtering for stable training. The model supports ReAct for core ability checks and an IterResearch-based 'Heavy' mode for max performance through test-time scaling. It's ideal for advanced research agents, tool use, and heavy inference workflows.",
        "context_length": 131072,
        "hugging_face_id": "Alibaba-NLP/Tongyi-DeepResearch-30B-A3B",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0",
          "completion": "0",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/alibaba/tongyi-deepresearch-30b-a3b"
      },
      {
        "id": "alibaba/tongyi-deepresearch-30b-a3b",
        "slug": "alibaba/tongyi-deepresearch-30b-a3b",
        "name": "Tongyi DeepResearch 30B A3B",
        "vendor": "Alibaba",
        "base_name": "Tongyi DeepResearch 30B A3B",
        "created": 1758210804,
        "description": "Tongyi DeepResearch is an agentic large language model developed by Tongyi Lab, with 30 billion total parameters activating only 3 billion per token. It's optimized for long-horizon, deep information-seeking tasks and delivers state-of-the-art performance on benchmarks like Humanity's Last Exam, BrowserComp, BrowserComp-ZH, WebWalkerQA, GAIA, xbench-DeepSearch, and FRAMES. This makes it superior for complex agentic search, reasoning, and multi-step problem-solving compared to prior models.\n\nThe model includes a fully automated synthetic data pipeline for scalable pre-training, fine-tuning, and reinforcement learning. It uses large-scale continual pre-training on diverse agentic data to boost reasoning and stay fresh. It also features end-to-end on-policy RL with a customized Group Relative Policy Optimization, including token-level gradients and negative sample filtering for stable training. The model supports ReAct for core ability checks and an IterResearch-based 'Heavy' mode for max performance through test-time scaling. It's ideal for advanced research agents, tool use, and heavy inference workflows.",
        "context_length": 131072,
        "hugging_face_id": "Alibaba-NLP/Tongyi-DeepResearch-30B-A3B",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000009",
          "completion": "0.0000004",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/alibaba/tongyi-deepresearch-30b-a3b"
      },
      {
        "id": "qwen/qwen3-coder-flash",
        "slug": "qwen/qwen3-coder-flash",
        "name": "Qwen: Qwen3 Coder Flash",
        "vendor": "Qwen",
        "base_name": "Qwen3 Coder Flash",
        "created": 1758115536,
        "description": "Qwen3 Coder Flash is Alibaba's fast and cost efficient version of their proprietary Qwen3 Coder Plus. It is a powerful coding agent model specializing in autonomous programming via tool calling and environment interaction, combining coding proficiency with versatile general-purpose abilities.",
        "context_length": 128000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000015",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.00000008"
        },
        "top_provider": {
          "context_length": 128000,
          "max_completion_tokens": 65536,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-coder-flash"
      },
      {
        "id": "arcee-ai/afm-4.5b",
        "slug": "arcee-ai/afm-4.5b",
        "name": "Arcee AI: AFM 4.5B",
        "vendor": "Arcee AI",
        "base_name": "AFM 4.5B",
        "created": 1758040484,
        "description": "AFM-4.5B is a 4.5 billion parameter instruction-tuned language model developed by Arcee AI. The model was pretrained on approximately 8 trillion tokens, including 6.5 trillion tokens of general data and 1.5 trillion tokens with an emphasis on mathematical reasoning and code generation. ",
        "context_length": 65536,
        "hugging_face_id": "arcee-ai/AFM-4.5B",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.000000048",
          "completion": "0.00000015",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 65536,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "stop",
          "structured_outputs",
          "temperature",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/arcee-ai/afm-4.5b"
      },
      {
        "id": "opengvlab/internvl3-78b",
        "slug": "opengvlab/internvl3-78b",
        "name": "OpenGVLab: InternVL3 78B",
        "vendor": "OpenGVLab",
        "base_name": "InternVL3 78B",
        "created": 1757962555,
        "description": "The InternVL3 series is an advanced multimodal large language model (MLLM). Compared to InternVL 2.5, InternVL3 demonstrates stronger multimodal perception and reasoning capabilities. \n\nIn addition, InternVL3 is benchmarked against the Qwen2.5 Chat models, whose pre-trained base models serve as the initialization for its language component. Benefiting from Native Multimodal Pre-Training, the InternVL3 series surpasses the Qwen2.5 series in overall text performance.",
        "context_length": 32768,
        "hugging_face_id": "OpenGVLab/InternVL3-78B",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "image",
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000007",
          "completion": "0.00000026",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 32768,
          "max_completion_tokens": 32768,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/opengvlab/internvl3-78b"
      },
      {
        "id": "qwen/qwen3-next-80b-a3b-thinking",
        "slug": "qwen/qwen3-next-80b-a3b-thinking-2509",
        "name": "Qwen: Qwen3 Next 80B A3B Thinking",
        "vendor": "Qwen",
        "base_name": "Qwen3 Next 80B A3B Thinking",
        "created": 1757612284,
        "description": "Qwen3-Next-80B-A3B-Thinking is a reasoning-first chat model in the Qwen3-Next line that outputs structured “thinking” traces by default. It’s designed for hard multi-step problems; math proofs, code synthesis/debugging, logic, and agentic planning, and reports strong results across knowledge, reasoning, coding, alignment, and multilingual evaluations. Compared with prior Qwen3 variants, it emphasizes stability under long chains of thought and efficient scaling during inference, and it is tuned to follow complex instructions while reducing repetitive or off-task behavior.\n\nThe model is suitable for agent frameworks and tool use (function calling), retrieval-heavy workflows, and standardized benchmarking where step-by-step solutions are required. It supports long, detailed completions and leverages throughput-oriented techniques (e.g., multi-token prediction) for faster generation. Note that it operates in thinking-only mode.",
        "context_length": 262144,
        "hugging_face_id": "Qwen/Qwen3-Next-80B-A3B-Thinking",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000014",
          "completion": "0.0000012",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-next-80b-a3b-thinking-2509"
      },
      {
        "id": "qwen/qwen3-next-80b-a3b-instruct",
        "slug": "qwen/qwen3-next-80b-a3b-instruct-2509",
        "name": "Qwen: Qwen3 Next 80B A3B Instruct",
        "vendor": "Qwen",
        "base_name": "Qwen3 Next 80B A3B Instruct",
        "created": 1757612213,
        "description": "Qwen3-Next-80B-A3B-Instruct is an instruction-tuned chat model in the Qwen3-Next series optimized for fast, stable responses without “thinking” traces. It targets complex tasks across reasoning, code generation, knowledge QA, and multilingual use, while remaining robust on alignment and formatting. Compared with prior Qwen3 instruct variants, it focuses on higher throughput and stability on ultra-long inputs and multi-turn dialogues, making it well-suited for RAG, tool use, and agentic workflows that require consistent final answers rather than visible chain-of-thought.\n\nThe model employs scaling-efficient training and decoding to improve parameter efficiency and inference speed, and has been validated on a broad set of public benchmarks where it reaches or approaches larger Qwen3 systems in several categories while outperforming earlier mid-sized baselines. It is best used as a general assistant, code helper, and long-context task solver in production settings where deterministic, instruction-following outputs are preferred.",
        "context_length": 262144,
        "hugging_face_id": "Qwen/Qwen3-Next-80B-A3B-Instruct",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000001",
          "completion": "0.0000008",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": 262144,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-next-80b-a3b-instruct-2509"
      },
      {
        "id": "meituan/longcat-flash-chat:free",
        "slug": "meituan/longcat-flash-chat",
        "name": "Meituan: LongCat Flash Chat (free)",
        "vendor": "Meituan",
        "base_name": "LongCat Flash Chat (free)",
        "created": 1757427658,
        "description": "LongCat-Flash-Chat is a large-scale Mixture-of-Experts (MoE) model with 560B total parameters, of which 18.6B–31.3B (≈27B on average) are dynamically activated per input. It introduces a shortcut-connected MoE design to reduce communication overhead and achieve high throughput while maintaining training stability through advanced scaling strategies such as hyperparameter transfer, deterministic computation, and multi-stage optimization.\n\nThis release, LongCat-Flash-Chat, is a non-thinking foundation model optimized for conversational and agentic tasks. It supports long context windows up to 128K tokens and shows competitive performance across reasoning, coding, instruction following, and domain benchmarks, with particular strengths in tool use and complex multi-step interactions.",
        "context_length": 131072,
        "hugging_face_id": "meituan-longcat/LongCat-Flash-Chat",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0",
          "completion": "0",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/meituan/longcat-flash-chat"
      },
      {
        "id": "meituan/longcat-flash-chat",
        "slug": "meituan/longcat-flash-chat",
        "name": "Meituan: LongCat Flash Chat",
        "vendor": "Meituan",
        "base_name": "LongCat Flash Chat",
        "created": 1757427658,
        "description": "LongCat-Flash-Chat is a large-scale Mixture-of-Experts (MoE) model with 560B total parameters, of which 18.6B–31.3B (≈27B on average) are dynamically activated per input. It introduces a shortcut-connected MoE design to reduce communication overhead and achieve high throughput while maintaining training stability through advanced scaling strategies such as hyperparameter transfer, deterministic computation, and multi-stage optimization.\n\nThis release, LongCat-Flash-Chat, is a non-thinking foundation model optimized for conversational and agentic tasks. It supports long context windows up to 128K tokens and shows competitive performance across reasoning, coding, instruction following, and domain benchmarks, with particular strengths in tool use and complex multi-step interactions.",
        "context_length": 131072,
        "hugging_face_id": "meituan-longcat/LongCat-Flash-Chat",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000015",
          "completion": "0.00000075",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "temperature",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/meituan/longcat-flash-chat"
      },
      {
        "id": "qwen/qwen-plus-2025-07-28:thinking",
        "slug": "qwen/qwen-plus-2025-07-28",
        "name": "Qwen: Qwen Plus 0728 (thinking)",
        "vendor": "Qwen",
        "base_name": "Qwen Plus 0728 (thinking)",
        "created": 1757347599,
        "description": "Qwen Plus 0728, based on the Qwen3 foundation model, is a 1 million context hybrid reasoning model with a balanced performance, speed, and cost combination.",
        "context_length": 1000000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000004",
          "completion": "0.000004",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 1000000,
          "max_completion_tokens": 32768,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "presence_penalty",
          "reasoning",
          "response_format",
          "seed",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen-plus-2025-07-28"
      },
      {
        "id": "qwen/qwen-plus-2025-07-28",
        "slug": "qwen/qwen-plus-2025-07-28",
        "name": "Qwen: Qwen Plus 0728",
        "vendor": "Qwen",
        "base_name": "Qwen Plus 0728",
        "created": 1757347599,
        "description": "Qwen Plus 0728, based on the Qwen3 foundation model, is a 1 million context hybrid reasoning model with a balanced performance, speed, and cost combination.",
        "context_length": 1000000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000004",
          "completion": "0.0000012",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 1000000,
          "max_completion_tokens": 32768,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen-plus-2025-07-28"
      },
      {
        "id": "nvidia/nemotron-nano-9b-v2:free",
        "slug": "nvidia/nemotron-nano-9b-v2",
        "name": "NVIDIA: Nemotron Nano 9B V2 (free)",
        "vendor": "NVIDIA",
        "base_name": "Nemotron Nano 9B V2 (free)",
        "created": 1757106807,
        "description": "NVIDIA-Nemotron-Nano-9B-v2 is a large language model (LLM) trained from scratch by NVIDIA, and designed as a unified model for both reasoning and non-reasoning tasks. It responds to user queries and tasks by first generating a reasoning trace and then concluding with a final response. \n\nThe model's reasoning capabilities can be controlled via a system prompt. If the user prefers the model to provide its final answer without intermediate reasoning traces, it can be configured to do so.",
        "context_length": 128000,
        "hugging_face_id": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0",
          "completion": "0",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 128000,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "reasoning",
          "response_format",
          "structured_outputs",
          "tool_choice",
          "tools"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/nvidia/nemotron-nano-9b-v2"
      },
      {
        "id": "nvidia/nemotron-nano-9b-v2",
        "slug": "nvidia/nemotron-nano-9b-v2",
        "name": "NVIDIA: Nemotron Nano 9B V2",
        "vendor": "NVIDIA",
        "base_name": "Nemotron Nano 9B V2",
        "created": 1757106807,
        "description": "NVIDIA-Nemotron-Nano-9B-v2 is a large language model (LLM) trained from scratch by NVIDIA, and designed as a unified model for both reasoning and non-reasoning tasks. It responds to user queries and tasks by first generating a reasoning trace and then concluding with a final response. \n\nThe model's reasoning capabilities can be controlled via a system prompt. If the user prefers the model to provide its final answer without intermediate reasoning traces, it can be configured to do so.",
        "context_length": 131072,
        "hugging_face_id": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000004",
          "completion": "0.00000016",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/nvidia/nemotron-nano-9b-v2"
      },
      {
        "id": "moonshotai/kimi-k2-0905",
        "slug": "moonshotai/kimi-k2-0905",
        "name": "MoonshotAI: Kimi K2 0905",
        "vendor": "MoonshotAI",
        "base_name": "Kimi K2 0905",
        "created": 1757021147,
        "description": "Kimi K2 0905 is the September update of [Kimi K2 0711](moonshotai/kimi-k2). It is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 billion active per forward pass. It supports long-context inference up to 256k tokens, extended from the previous 128k.\n\nThis update improves agentic coding with higher accuracy and better generalization across scaffolds, and enhances frontend coding with more aesthetic and functional outputs for web, 3D, and related tasks. Kimi K2 is optimized for agentic capabilities, including advanced tool use, reasoning, and code synthesis. It excels across coding (LiveCodeBench, SWE-bench), reasoning (ZebraLogic, GPQA), and tool-use (Tau2, AceBench) benchmarks. The model is trained with a novel stack incorporating the MuonClip optimizer for stable large-scale MoE training.",
        "context_length": 262144,
        "hugging_face_id": "moonshotai/Kimi-K2-Instruct-0905",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000039",
          "completion": "0.0000019",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": 262144,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/moonshotai/kimi-k2-0905"
      },
      {
        "id": "deepcogito/cogito-v2-preview-llama-109b-moe",
        "slug": "deepcogito/cogito-v2-preview-llama-109b-moe",
        "name": "Cogito V2 Preview Llama 109B",
        "vendor": "Deepcogito",
        "base_name": "Cogito V2 Preview Llama 109B",
        "created": 1756831568,
        "description": "An instruction-tuned, hybrid-reasoning Mixture-of-Experts model built on Llama-4-Scout-17B-16E. Cogito v2 can answer directly or engage an extended “thinking” phase, with alignment guided by Iterated Distillation & Amplification (IDA). It targets coding, STEM, instruction following, and general helpfulness, with stronger multilingual, tool-calling, and reasoning performance than size-equivalent baselines. The model supports long-context use (up to 10M tokens) and standard Transformers workflows. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)",
        "context_length": 32767,
        "hugging_face_id": "deepcogito/cogito-v2-preview-llama-109B-MoE",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "image",
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Llama4",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000018",
          "completion": "0.00000059",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 32767,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "stop",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/deepcogito/cogito-v2-preview-llama-109b-moe"
      },
      {
        "id": "deepcogito/cogito-v2-preview-deepseek-671b",
        "slug": "deepcogito/cogito-v2-preview-deepseek-671b",
        "name": "Deep Cogito: Cogito V2 Preview Deepseek 671B",
        "vendor": "Deep Cogito",
        "base_name": "Cogito V2 Preview Deepseek 671B",
        "created": 1756830949,
        "description": "Cogito v2 is a multilingual, instruction-tuned Mixture of Experts (MoE) large language model with 671 billion parameters. It supports both standard and reasoning-based generation modes. The model introduces hybrid reasoning via Iterated Distillation and Amplification (IDA)—an iterative self-improvement strategy designed to scale alignment with general intelligence. Cogito v2 has been optimized for STEM, programming, instruction following, and tool use. It supports 128k context length and offers strong performance in both multilingual and code-heavy environments. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)",
        "context_length": 163840,
        "hugging_face_id": "deepcogito/cogito-v2-preview-deepseek-671B-MoE",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "DeepSeek",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000125",
          "completion": "0.00000125",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 163840,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "stop",
          "temperature",
          "top_k",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/deepcogito/cogito-v2-preview-deepseek-671b"
      },
      {
        "id": "stepfun-ai/step3",
        "slug": "stepfun-ai/step3",
        "name": "StepFun: Step3",
        "vendor": "StepFun",
        "base_name": "Step3",
        "created": 1756415375,
        "description": "Step3 is a cutting-edge multimodal reasoning model—built on a Mixture-of-Experts architecture with 321B total parameters and 38B active. It is designed end-to-end to minimize decoding costs while delivering top-tier performance in vision–language reasoning. Through the co-design of Multi-Matrix Factorization Attention (MFA) and Attention-FFN Disaggregation (AFD), Step3 maintains exceptional efficiency across both flagship and low-end accelerators.",
        "context_length": 65536,
        "hugging_face_id": "stepfun-ai/step3",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "image",
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000057",
          "completion": "0.00000142",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 65536,
          "max_completion_tokens": 65536,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "reasoning",
          "response_format",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/stepfun-ai/step3"
      },
      {
        "id": "qwen/qwen3-30b-a3b-thinking-2507",
        "slug": "qwen/qwen3-30b-a3b-thinking-2507",
        "name": "Qwen: Qwen3 30B A3B Thinking 2507",
        "vendor": "Qwen",
        "base_name": "Qwen3 30B A3B Thinking 2507",
        "created": 1756399192,
        "description": "Qwen3-30B-A3B-Thinking-2507 is a 30B parameter Mixture-of-Experts reasoning model optimized for complex tasks requiring extended multi-step thinking. The model is designed specifically for “thinking mode,” where internal reasoning traces are separated from final answers.\n\nCompared to earlier Qwen3-30B releases, this version improves performance across logical reasoning, mathematics, science, coding, and multilingual benchmarks. It also demonstrates stronger instruction following, tool use, and alignment with human preferences. With higher reasoning efficiency and extended output budgets, it is best suited for advanced research, competitive problem solving, and agentic applications requiring structured long-context reasoning.",
        "context_length": 262144,
        "hugging_face_id": "Qwen/Qwen3-30B-A3B-Thinking-2507",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Qwen3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000008",
          "completion": "0.00000029",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 262144,
          "max_completion_tokens": 262144,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/qwen/qwen3-30b-a3b-thinking-2507"
      },
      {
        "id": "x-ai/grok-code-fast-1",
        "slug": "x-ai/grok-code-fast-1",
        "name": "xAI: Grok Code Fast 1",
        "vendor": "xAI",
        "base_name": "Grok Code Fast 1",
        "created": 1756238927,
        "description": "Grok Code Fast 1 is a speedy and economical reasoning model that excels at agentic coding. With reasoning traces visible in the response, developers can steer Grok Code for high-quality work flows.",
        "context_length": 256000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Grok",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000002",
          "completion": "0.0000015",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.00000002"
        },
        "top_provider": {
          "context_length": 256000,
          "max_completion_tokens": 10000,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "logprobs",
          "max_tokens",
          "reasoning",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/x-ai/grok-code-fast-1"
      },
      {
        "id": "nousresearch/hermes-4-70b",
        "slug": "nousresearch/hermes-4-70b",
        "name": "Nous: Hermes 4 70B",
        "vendor": "Nous",
        "base_name": "Hermes 4 70B",
        "created": 1756236182,
        "description": "Hermes 4 70B is a hybrid reasoning model from Nous Research, built on Meta-Llama-3.1-70B. It introduces the same hybrid mode as the larger 405B release, allowing the model to either respond directly or generate explicit <think>...</think> reasoning traces before answering. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)\n\nThis 70B variant is trained with the expanded post-training corpus (~60B tokens) emphasizing verified reasoning data, leading to improvements in mathematics, coding, STEM, logic, and structured outputs while maintaining general assistant performance. It supports JSON mode, schema adherence, function calling, and tool use, and is designed for greater steerability with reduced refusal rates.",
        "context_length": 131072,
        "hugging_face_id": "NousResearch/Hermes-4-70B",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Llama3",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000011",
          "completion": "0.00000038",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "seed",
          "stop",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/nousresearch/hermes-4-70b"
      },
      {
        "id": "nousresearch/hermes-4-405b",
        "slug": "nousresearch/hermes-4-405b",
        "name": "Nous: Hermes 4 405B",
        "vendor": "Nous",
        "base_name": "Hermes 4 405B",
        "created": 1756235463,
        "description": "Hermes 4 is a large-scale reasoning model built on Meta-Llama-3.1-405B and released by Nous Research. It introduces a hybrid reasoning mode, where the model can choose to deliberate internally with <think>...</think> traces or respond directly, offering flexibility between speed and depth. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)\n\nThe model is instruction-tuned with an expanded post-training corpus (~60B tokens) emphasizing reasoning traces, improving performance in math, code, STEM, and logical reasoning, while retaining broad assistant utility. It also supports structured outputs, including JSON mode, schema adherence, function calling, and tool use. Hermes 4 is trained for steerability, lower refusal rates, and alignment toward neutral, user-directed behavior.",
        "context_length": 131072,
        "hugging_face_id": "NousResearch/Hermes-4-405B",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000012",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": 131072,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "seed",
          "stop",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/nousresearch/hermes-4-405b"
      },
      {
        "id": "google/gemini-2.5-flash-image-preview",
        "slug": "google/gemini-2.5-flash-image-preview",
        "name": "Google: Gemini 2.5 Flash Image Preview (Nano Banana)",
        "vendor": "Google",
        "base_name": "Gemini 2.5 Flash Image Preview (Nano Banana)",
        "created": 1756218977,
        "description": "Gemini 2.5 Flash Image Preview, a.k.a. \"Nano Banana,\" is a state of the art image generation model with contextual understanding. It is capable of image generation, edits, and multi-turn conversations.",
        "context_length": 32768,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text+image",
          "input_modalities": [
            "image",
            "text"
          ],
          "output_modalities": [
            "image",
            "text"
          ],
          "tokenizer": "Gemini",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000003",
          "completion": "0.0000025",
          "request": "0",
          "image": "0.001238",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 32768,
          "max_completion_tokens": 8192,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "max_tokens",
          "response_format",
          "seed",
          "structured_outputs",
          "temperature",
          "top_p"
        ],
        "default_parameters": {
          "temperature": null,
          "top_p": null,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/google/gemini-2.5-flash-image-preview"
      },
      {
        "id": "deepseek/deepseek-chat-v3.1:free",
        "slug": "deepseek/deepseek-chat-v3.1",
        "name": "DeepSeek: DeepSeek V3.1 (free)",
        "vendor": "DeepSeek",
        "base_name": "DeepSeek V3.1 (free)",
        "created": 1755779628,
        "description": "DeepSeek-V3.1 is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinking modes via prompt templates. It extends the DeepSeek-V3 base with a two-phase long-context training process, reaching up to 128K tokens, and uses FP8 microscaling for efficient inference. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)\n\nThe model improves tool use, code generation, and reasoning efficiency, achieving performance comparable to DeepSeek-R1 on difficult benchmarks while responding more quickly. It supports structured tool calling, code agents, and search agents, making it suitable for research, coding, and agentic workflows. \n\nIt succeeds the [DeepSeek V3-0324](/deepseek/deepseek-chat-v3-0324) model and performs well on a variety of tasks.",
        "context_length": 163800,
        "hugging_face_id": "deepseek-ai/DeepSeek-V3.1",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "DeepSeek",
          "instruct_type": "deepseek-v3.1"
        },
        "pricing": {
          "prompt": "0",
          "completion": "0",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 163800,
          "max_completion_tokens": null,
          "is_moderated": true
        },
        "per_request_limits": null,
        "supported_parameters": [
          "include_reasoning",
          "max_tokens",
          "reasoning",
          "seed",
          "stop",
          "temperature"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/deepseek/deepseek-chat-v3.1"
      },
      {
        "id": "deepseek/deepseek-chat-v3.1",
        "slug": "deepseek/deepseek-chat-v3.1",
        "name": "DeepSeek: DeepSeek V3.1",
        "vendor": "DeepSeek",
        "base_name": "DeepSeek V3.1",
        "created": 1755779628,
        "description": "DeepSeek-V3.1 is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinking modes via prompt templates. It extends the DeepSeek-V3 base with a two-phase long-context training process, reaching up to 128K tokens, and uses FP8 microscaling for efficient inference. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. [Learn more in our docs](https://openrouter.ai/docs/use-cases/reasoning-tokens#enable-reasoning-with-default-config)\n\nThe model improves tool use, code generation, and reasoning efficiency, achieving performance comparable to DeepSeek-R1 on difficult benchmarks while responding more quickly. It supports structured tool calling, code agents, and search agents, making it suitable for research, coding, and agentic workflows. \n\nIt succeeds the [DeepSeek V3-0324](/deepseek/deepseek-chat-v3-0324) model and performs well on a variety of tasks.",
        "context_length": 163840,
        "hugging_face_id": "deepseek-ai/DeepSeek-V3.1",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "DeepSeek",
          "instruct_type": "deepseek-v3.1"
        },
        "pricing": {
          "prompt": "0.0000002",
          "completion": "0.0000008",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 163840,
          "max_completion_tokens": 163840,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "min_p",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_k",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/deepseek/deepseek-chat-v3.1"
      },
      {
        "id": "openai/gpt-4o-audio-preview",
        "slug": "openai/gpt-4o-audio-preview",
        "name": "OpenAI: GPT-4o Audio",
        "vendor": "OpenAI",
        "base_name": "GPT-4o Audio",
        "created": 1755233061,
        "description": "The gpt-4o-audio-preview model adds support for audio inputs as prompts. This enhancement allows the model to detect nuances within audio recordings and add depth to generated user experiences. Audio outputs are currently not supported. Audio tokens are priced at $40 per million input audio tokens.",
        "context_length": 128000,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "audio",
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "GPT",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000025",
          "completion": "0.00001",
          "request": "0",
          "image": "0",
          "audio": "0.00004",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 128000,
          "max_completion_tokens": 16384,
          "is_moderated": true
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "logit_bias",
          "logprobs",
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_logprobs",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/openai/gpt-4o-audio-preview"
      },
      {
        "id": "mistralai/mistral-medium-3.1",
        "slug": "mistralai/mistral-medium-3.1",
        "name": "Mistral: Mistral Medium 3.1",
        "vendor": "Mistral",
        "base_name": "Mistral Medium 3.1",
        "created": 1755095639,
        "description": "Mistral Medium 3.1 is an updated version of Mistral Medium 3, which is a high-performance enterprise-grade language model designed to deliver frontier-level capabilities at significantly reduced operational cost. It balances state-of-the-art reasoning and multimodal performance with 8× lower cost compared to traditional large models, making it suitable for scalable deployments across professional and industrial use cases.\n\nThe model excels in domains such as coding, STEM reasoning, and enterprise adaptation. It supports hybrid, on-prem, and in-VPC deployments and is optimized for integration into custom workflows. Mistral Medium 3.1 offers competitive accuracy relative to larger models like Claude Sonnet 3.5/3.7, Llama 4 Maverick, and Command R+, while maintaining broad compatibility across cloud environments.",
        "context_length": 131072,
        "hugging_face_id": "",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Mistral",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.0000004",
          "completion": "0.000002",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 131072,
          "max_completion_tokens": null,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "max_tokens",
          "presence_penalty",
          "response_format",
          "seed",
          "stop",
          "structured_outputs",
          "temperature",
          "tool_choice",
          "tools",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.3
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/mistralai/mistral-medium-3.1"
      },
      {
        "id": "baidu/ernie-4.5-21b-a3b",
        "slug": "baidu/ernie-4.5-21b-a3b",
        "name": "Baidu: ERNIE 4.5 21B A3B",
        "vendor": "Baidu",
        "base_name": "ERNIE 4.5 21B A3B",
        "created": 1755034167,
        "description": "A sophisticated text-based Mixture-of-Experts (MoE) model featuring 21B total parameters with 3B activated per token, delivering exceptional multimodal understanding and generation through heterogeneous MoE structures and modality-isolated routing. Supporting an extensive 131K token context length, the model achieves efficient inference via multi-expert parallel collaboration and quantization, while advanced post-training techniques including SFT, DPO, and UPO ensure optimized performance across diverse applications with specialized routing and balancing losses for superior task handling.",
        "context_length": 120000,
        "hugging_face_id": "baidu/ERNIE-4.5-21B-A3B-PT",
        "architecture": {
          "modality": "text->text",
          "input_modalities": [
            "text"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000007",
          "completion": "0.00000028",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 120000,
          "max_completion_tokens": 8000,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "max_tokens",
          "presence_penalty",
          "repetition_penalty",
          "seed",
          "stop",
          "temperature",
          "top_k",
          "top_p"
        ],
        "default_parameters": {
          "temperature": 0.8,
          "top_p": 0.8,
          "frequency_penalty": null
        },
        "tags": [],
        "display_url": "https://openrouter.ai/models/baidu/ernie-4.5-21b-a3b"
      },
      {
        "id": "baidu/ernie-4.5-vl-28b-a3b",
        "slug": "baidu/ernie-4.5-vl-28b-a3b",
        "name": "Baidu: ERNIE 4.5 VL 28B A3B",
        "vendor": "Baidu",
        "base_name": "ERNIE 4.5 VL 28B A3B",
        "created": 1755032836,
        "description": "A powerful multimodal Mixture-of-Experts chat model featuring 28B total parameters with 3B activated per token, delivering exceptional text and vision understanding through its innovative heterogeneous MoE structure with modality-isolated routing. Built with scaling-efficient infrastructure for high-throughput training and inference, the model leverages advanced post-training techniques including SFT, DPO, and UPO for optimized performance, while supporting an impressive 131K context length and RLVR alignment for superior cross-modal reasoning and generation capabilities.",
        "context_length": 30000,
        "hugging_face_id": "baidu/ERNIE-4.5-VL-28B-A3B-PT",
        "architecture": {
          "modality": "text+image->text",
          "input_modalities": [
            "text",
            "image"
          ],
          "output_modalities": [
            "text"
          ],
          "tokenizer": "Other",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.00000014",
          "completion": "0.00000056",
          "request": "0",
          "image": "0",
          "web_search": "0",
          "internal_reasoning": "0"
        },
        "top_provider": {
          "context_length": 30000,
          "max_completion_tokens": 8000,
          "is_moderated": false
        },
        "per_request_limits": null,
        "supported_parameters": [
          "frequency_penalty",
          "include_reasoning",
          "max_tokens",
          "presence_penalty",
          "reasoning",
          "repetition_penalty",
          "seed",
          "stop",
          "temperature",
          "top_k",
          "top_p"
        ],
        "default_parameters": {},
        "tags": [],
        "display_url": "https://openrouter.ai/models/baidu/ernie-4.5-vl-28b-a3b"
      }
    ],
    "llms": [
      {
        "id": "c3738fb0-3408-4430-a699-760ae4b70c93",
        "name": "GPT-5 (minimal)",
        "slug": "gpt-5-minimal",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 43.5,
          "artificial_analysis_coding_index": 37.4,
          "artificial_analysis_math_index": 31.7,
          "mmlu_pro": 0.806,
          "gpqa": 0.673,
          "hle": 0.054,
          "livecodebench": 0.558,
          "scicode": 0.388,
          "math_500": 0.861,
          "aime": 0.367,
          "aime_25": 0.317,
          "ifbench": 0.456,
          "lcr": 0.25,
          "terminalbench_hard": 0.177,
          "tau2": 0.67
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.438,
          "price_1m_input_tokens": 1.25,
          "price_1m_output_tokens": 10
        },
        "median_output_tokens_per_second": 122.349,
        "median_time_to_first_token_seconds": 1.295,
        "median_time_to_first_answer_token": 1.295
      },
      {
        "id": "16c5b637-8bce-4252-81f2-1b87a36a4e4c",
        "name": "o3",
        "slug": "o3",
        "release_date": "2025-04-16",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 65.5,
          "artificial_analysis_coding_index": 52.2,
          "artificial_analysis_math_index": 88.3,
          "mmlu_pro": 0.853,
          "gpqa": 0.827,
          "hle": 0.2,
          "livecodebench": 0.808,
          "scicode": 0.41,
          "math_500": 0.992,
          "aime": 0.903,
          "aime_25": 0.883,
          "ifbench": 0.714,
          "lcr": 0.693,
          "terminalbench_hard": 0.348,
          "tau2": 0.807
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.5,
          "price_1m_input_tokens": 2,
          "price_1m_output_tokens": 8
        },
        "median_output_tokens_per_second": 242.903,
        "median_time_to_first_token_seconds": 11.963,
        "median_time_to_first_answer_token": 11.963
      },
      {
        "id": "36f73aaf-d38a-4b56-a2b3-d04d17186910",
        "name": "gpt-oss-20B (high)",
        "slug": "gpt-oss-20b",
        "release_date": "2025-08-05",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 43.3,
          "artificial_analysis_coding_index": 32.8,
          "artificial_analysis_math_index": 61.7,
          "mmlu_pro": 0.736,
          "gpqa": 0.617,
          "hle": 0.085,
          "livecodebench": 0.572,
          "scicode": 0.354,
          "math_500": null,
          "aime": null,
          "aime_25": 0.617,
          "ifbench": 0.605,
          "lcr": 0.187,
          "terminalbench_hard": 0.057,
          "tau2": 0.497
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.094,
          "price_1m_input_tokens": 0.06,
          "price_1m_output_tokens": 0.2
        },
        "median_output_tokens_per_second": 213.215,
        "median_time_to_first_token_seconds": 0.412,
        "median_time_to_first_answer_token": 9.792
      },
      {
        "id": "f0083258-8646-45b8-8082-7aaf6c2ea82a",
        "name": "gpt-oss-120B (high)",
        "slug": "gpt-oss-120b",
        "release_date": "2025-08-05",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 58,
          "artificial_analysis_coding_index": 41.2,
          "artificial_analysis_math_index": 93.4,
          "mmlu_pro": 0.808,
          "gpqa": 0.782,
          "hle": 0.185,
          "livecodebench": 0.653,
          "scicode": 0.362,
          "math_500": null,
          "aime": null,
          "aime_25": 0.934,
          "ifbench": 0.69,
          "lcr": 0.507,
          "terminalbench_hard": 0.22,
          "tau2": 0.658
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.263,
          "price_1m_input_tokens": 0.15,
          "price_1m_output_tokens": 0.6
        },
        "median_output_tokens_per_second": 326.738,
        "median_time_to_first_token_seconds": 0.461,
        "median_time_to_first_answer_token": 6.582
      },
      {
        "id": "eab1492c-b853-4852-aa71-06b0ec2481c1",
        "name": "GPT-5 (ChatGPT)",
        "slug": "gpt-5-chatgpt",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 41.8,
          "artificial_analysis_coding_index": 34.7,
          "artificial_analysis_math_index": 48.3,
          "mmlu_pro": 0.82,
          "gpqa": 0.686,
          "hle": 0.058,
          "livecodebench": 0.543,
          "scicode": 0.378,
          "math_500": null,
          "aime": null,
          "aime_25": 0.483,
          "ifbench": 0.45,
          "lcr": 0.637,
          "terminalbench_hard": 0.121,
          "tau2": 0
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.438,
          "price_1m_input_tokens": 1.25,
          "price_1m_output_tokens": 10
        },
        "median_output_tokens_per_second": 117.117,
        "median_time_to_first_token_seconds": 0.474,
        "median_time_to_first_answer_token": 0.474
      },
      {
        "id": "7f3c9423-3ee3-4369-a6d9-3f2a40aff00e",
        "name": "GPT-5 (low)",
        "slug": "gpt-5-low",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 61.8,
          "artificial_analysis_coding_index": 46.8,
          "artificial_analysis_math_index": 83,
          "mmlu_pro": 0.86,
          "gpqa": 0.808,
          "hle": 0.184,
          "livecodebench": 0.763,
          "scicode": 0.391,
          "math_500": 0.987,
          "aime": 0.83,
          "aime_25": 0.83,
          "ifbench": 0.666,
          "lcr": 0.587,
          "terminalbench_hard": 0.248,
          "tau2": 0.842
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.438,
          "price_1m_input_tokens": 1.25,
          "price_1m_output_tokens": 10
        },
        "median_output_tokens_per_second": 206.561,
        "median_time_to_first_token_seconds": 15.455,
        "median_time_to_first_answer_token": 15.455
      },
      {
        "id": "48e50f00-1fd1-4acc-b337-61078aa341e6",
        "name": "GPT-5 (high)",
        "slug": "gpt-5",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 68.5,
          "artificial_analysis_coding_index": 52.7,
          "artificial_analysis_math_index": 94.3,
          "mmlu_pro": 0.871,
          "gpqa": 0.854,
          "hle": 0.265,
          "livecodebench": 0.846,
          "scicode": 0.429,
          "math_500": 0.994,
          "aime": 0.957,
          "aime_25": 0.943,
          "ifbench": 0.731,
          "lcr": 0.756,
          "terminalbench_hard": 0.305,
          "tau2": 0.848
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.438,
          "price_1m_input_tokens": 1.25,
          "price_1m_output_tokens": 10
        },
        "median_output_tokens_per_second": 165.49,
        "median_time_to_first_token_seconds": 69.399,
        "median_time_to_first_answer_token": 69.399
      },
      {
        "id": "4c111fbc-d13a-42b4-858c-1dc17fe3c1d1",
        "name": "Grok-1",
        "slug": "grok-1",
        "release_date": "2024-03-17",
        "model_creator": {
          "id": "a1e3ddcf-d3e4-44a5-9e8f-029a69850875",
          "name": "xAI",
          "slug": "xai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 18.2,
          "artificial_analysis_coding_index": null,
          "artificial_analysis_math_index": null,
          "mmlu_pro": null,
          "gpqa": null,
          "hle": null,
          "livecodebench": null,
          "scicode": null,
          "math_500": null,
          "aime": null,
          "aime_25": null,
          "ifbench": null,
          "lcr": null,
          "terminalbench_hard": null,
          "tau2": null
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0,
          "price_1m_input_tokens": 0,
          "price_1m_output_tokens": 0
        },
        "median_output_tokens_per_second": 0,
        "median_time_to_first_token_seconds": 0,
        "median_time_to_first_answer_token": 0
      },
      {
        "id": "bc26bfdb-4923-4442-a6ca-e77392923581",
        "name": "GPT-5 mini (minimal)",
        "slug": "gpt-5-mini-minimal",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 41.6,
          "artificial_analysis_coding_index": 35,
          "artificial_analysis_math_index": 46.7,
          "mmlu_pro": 0.775,
          "gpqa": 0.687,
          "hle": 0.05,
          "livecodebench": 0.545,
          "scicode": 0.369,
          "math_500": null,
          "aime": null,
          "aime_25": 0.467,
          "ifbench": 0.456,
          "lcr": 0.357,
          "terminalbench_hard": 0.135,
          "tau2": 0.319
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.688,
          "price_1m_input_tokens": 0.25,
          "price_1m_output_tokens": 2
        },
        "median_output_tokens_per_second": 70.755,
        "median_time_to_first_token_seconds": 1.259,
        "median_time_to_first_answer_token": 1.259
      },
      {
        "id": "05e45a36-b5c6-47a1-8adb-9ddc19add5b3",
        "name": "GPT-5 nano (minimal)",
        "slug": "gpt-5-nano-minimal",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 29.1,
          "artificial_analysis_coding_index": 27.5,
          "artificial_analysis_math_index": 27.3,
          "mmlu_pro": 0.556,
          "gpqa": 0.428,
          "hle": 0.041,
          "livecodebench": 0.47,
          "scicode": 0.291,
          "math_500": null,
          "aime": null,
          "aime_25": 0.273,
          "ifbench": 0.325,
          "lcr": 0.2,
          "terminalbench_hard": 0.064,
          "tau2": 0.257
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.138,
          "price_1m_input_tokens": 0.05,
          "price_1m_output_tokens": 0.4
        },
        "median_output_tokens_per_second": 182.096,
        "median_time_to_first_token_seconds": 1.03,
        "median_time_to_first_answer_token": 1.03
      },
      {
        "id": "e18e5e6a-5a31-4c0b-b80b-ac401392f446",
        "name": "GPT-5 nano (high)",
        "slug": "gpt-5-nano",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 51,
          "artificial_analysis_coding_index": 42.3,
          "artificial_analysis_math_index": 83.7,
          "mmlu_pro": 0.78,
          "gpqa": 0.676,
          "hle": 0.082,
          "livecodebench": 0.789,
          "scicode": 0.366,
          "math_500": null,
          "aime": null,
          "aime_25": 0.837,
          "ifbench": 0.676,
          "lcr": 0.417,
          "terminalbench_hard": 0.113,
          "tau2": 0.36
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.138,
          "price_1m_input_tokens": 0.05,
          "price_1m_output_tokens": 0.4
        },
        "median_output_tokens_per_second": 134.518,
        "median_time_to_first_token_seconds": 68.408,
        "median_time_to_first_answer_token": 68.408
      },
      {
        "id": "5d11e7a1-4f70-4e5a-9364-e193761d6757",
        "name": "GPT-5 Codex (high)",
        "slug": "gpt-5-codex",
        "release_date": "2025-09-23",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 68.5,
          "artificial_analysis_coding_index": 53.5,
          "artificial_analysis_math_index": 98.7,
          "mmlu_pro": 0.865,
          "gpqa": 0.837,
          "hle": 0.256,
          "livecodebench": 0.84,
          "scicode": 0.409,
          "math_500": null,
          "aime": null,
          "aime_25": 0.987,
          "ifbench": 0.741,
          "lcr": 0.69,
          "terminalbench_hard": 0.355,
          "tau2": 0.868
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.438,
          "price_1m_input_tokens": 1.25,
          "price_1m_output_tokens": 10
        },
        "median_output_tokens_per_second": 161.518,
        "median_time_to_first_token_seconds": 16.814,
        "median_time_to_first_answer_token": 16.814
      },
      {
        "id": "29855680-7469-43eb-8b88-cd3fb1d99da3",
        "name": "GPT-5 mini (high)",
        "slug": "gpt-5-mini",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 64.3,
          "artificial_analysis_coding_index": 51.4,
          "artificial_analysis_math_index": 90.7,
          "mmlu_pro": 0.837,
          "gpqa": 0.828,
          "hle": 0.197,
          "livecodebench": 0.838,
          "scicode": 0.392,
          "math_500": null,
          "aime": null,
          "aime_25": 0.907,
          "ifbench": 0.754,
          "lcr": 0.68,
          "terminalbench_hard": 0.312,
          "tau2": 0.684
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.688,
          "price_1m_input_tokens": 0.25,
          "price_1m_output_tokens": 2
        },
        "median_output_tokens_per_second": 68.494,
        "median_time_to_first_token_seconds": 110.803,
        "median_time_to_first_answer_token": 110.803
      },
      {
        "id": "8eb02396-f231-4189-ae15-05f7facebd9b",
        "name": "GPT-5 nano (medium)",
        "slug": "gpt-5-nano-medium",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 49.3,
          "artificial_analysis_coding_index": 42.1,
          "artificial_analysis_math_index": 78.3,
          "mmlu_pro": 0.772,
          "gpqa": 0.67,
          "hle": 0.076,
          "livecodebench": 0.763,
          "scicode": 0.338,
          "math_500": null,
          "aime": null,
          "aime_25": 0.783,
          "ifbench": 0.659,
          "lcr": 0.4,
          "terminalbench_hard": 0.163,
          "tau2": 0.304
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.138,
          "price_1m_input_tokens": 0.05,
          "price_1m_output_tokens": 0.4
        },
        "median_output_tokens_per_second": 172.126,
        "median_time_to_first_token_seconds": 37.781,
        "median_time_to_first_answer_token": 37.781
      },
      {
        "id": "5e965af0-ca5c-4f47-9ba9-06000508b84a",
        "name": "GPT-5 (medium)",
        "slug": "gpt-5-medium",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 66.4,
          "artificial_analysis_coding_index": 49.2,
          "artificial_analysis_math_index": 91.7,
          "mmlu_pro": 0.867,
          "gpqa": 0.842,
          "hle": 0.235,
          "livecodebench": 0.703,
          "scicode": 0.411,
          "math_500": 0.991,
          "aime": 0.917,
          "aime_25": 0.917,
          "ifbench": 0.706,
          "lcr": 0.728,
          "terminalbench_hard": 0.362,
          "tau2": 0.865
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.438,
          "price_1m_input_tokens": 1.25,
          "price_1m_output_tokens": 10
        },
        "median_output_tokens_per_second": 162.975,
        "median_time_to_first_token_seconds": 36.348,
        "median_time_to_first_answer_token": 36.348
      },
      {
        "id": "c3274a19-6d3c-4d01-ab9b-5055a0a40429",
        "name": "GPT-5 mini (medium)",
        "slug": "gpt-5-mini-medium",
        "release_date": "2025-08-07",
        "model_creator": {
          "id": "e67e56e3-15cd-43db-b679-da4660a69f41",
          "name": "OpenAI",
          "slug": "openai"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 60.8,
          "artificial_analysis_coding_index": 45.7,
          "artificial_analysis_math_index": 85,
          "mmlu_pro": 0.828,
          "gpqa": 0.803,
          "hle": 0.146,
          "livecodebench": 0.692,
          "scicode": 0.41,
          "math_500": null,
          "aime": null,
          "aime_25": 0.85,
          "ifbench": 0.712,
          "lcr": 0.66,
          "terminalbench_hard": 0.27,
          "tau2": 0.711
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.688,
          "price_1m_input_tokens": 0.25,
          "price_1m_output_tokens": 2
        },
        "median_output_tokens_per_second": 70.877,
        "median_time_to_first_token_seconds": 29.162,
        "median_time_to_first_answer_token": 29.162
      },
      {
        "id": "976cc8ad-7904-4056-83c5-960181f47d5f",
        "name": "Llama 3.3 Instruct 70B",
        "slug": "llama-3-3-instruct-70b",
        "release_date": "2024-12-06",
        "model_creator": {
          "id": "e1694725-0192-4e54-b1b8-c97e816c6cbe",
          "name": "Meta",
          "slug": "meta"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 27.9,
          "artificial_analysis_coding_index": 19.2,
          "artificial_analysis_math_index": 7.7,
          "mmlu_pro": 0.713,
          "gpqa": 0.498,
          "hle": 0.04,
          "livecodebench": 0.288,
          "scicode": 0.26,
          "math_500": 0.773,
          "aime": 0.3,
          "aime_25": 0.077,
          "ifbench": 0.471,
          "lcr": 0.15,
          "terminalbench_hard": 0.028,
          "tau2": 0.266
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.6,
          "price_1m_input_tokens": 0.5,
          "price_1m_output_tokens": 0.64
        },
        "median_output_tokens_per_second": 121.335,
        "median_time_to_first_token_seconds": 0.418,
        "median_time_to_first_answer_token": 0.418
      },
      {
        "id": "515852e7-ba9c-4571-8cf9-82ad6b45f22f",
        "name": "PALM-2",
        "slug": "palm-2",
        "release_date": "2023-05-10",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 6.6,
          "artificial_analysis_coding_index": 4.6,
          "artificial_analysis_math_index": null,
          "mmlu_pro": null,
          "gpqa": null,
          "hle": null,
          "livecodebench": null,
          "scicode": null,
          "math_500": null,
          "aime": null,
          "aime_25": null,
          "ifbench": null,
          "lcr": null,
          "terminalbench_hard": null,
          "tau2": null
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0,
          "price_1m_input_tokens": 0,
          "price_1m_output_tokens": 0
        },
        "median_output_tokens_per_second": 0,
        "median_time_to_first_token_seconds": 0,
        "median_time_to_first_answer_token": 0
      },
      {
        "id": "45c87531-2d57-48e0-8012-202cd636189e",
        "name": "Llama 3.1 Instruct 405B",
        "slug": "llama-3-1-instruct-405b",
        "release_date": "2024-07-23",
        "model_creator": {
          "id": "e1694725-0192-4e54-b1b8-c97e816c6cbe",
          "name": "Meta",
          "slug": "meta"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 28.1,
          "artificial_analysis_coding_index": 22.2,
          "artificial_analysis_math_index": 3,
          "mmlu_pro": 0.732,
          "gpqa": 0.515,
          "hle": 0.042,
          "livecodebench": 0.305,
          "scicode": 0.299,
          "math_500": 0.703,
          "aime": 0.213,
          "aime_25": 0.03,
          "ifbench": 0.39,
          "lcr": 0.243,
          "terminalbench_hard": 0.064,
          "tau2": 0.19
        },
        "pricing": {
          "price_1m_blended_3_to_1": 3.75,
          "price_1m_input_tokens": 3.25,
          "price_1m_output_tokens": 3.75
        },
        "median_output_tokens_per_second": 31.417,
        "median_time_to_first_token_seconds": 0.764,
        "median_time_to_first_answer_token": 0.764
      },
      {
        "id": "9ca71ac4-41c8-42c0-87dd-5704a9e5b94d",
        "name": "Llama 3.2 Instruct 90B (Vision)",
        "slug": "llama-3-2-instruct-90b-vision",
        "release_date": "2024-09-25",
        "model_creator": {
          "id": "e1694725-0192-4e54-b1b8-c97e816c6cbe",
          "name": "Meta",
          "slug": "meta"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 18.9,
          "artificial_analysis_coding_index": null,
          "artificial_analysis_math_index": null,
          "mmlu_pro": 0.671,
          "gpqa": 0.432,
          "hle": 0.049,
          "livecodebench": 0.214,
          "scicode": 0.24,
          "math_500": 0.629,
          "aime": 0.05,
          "aime_25": null,
          "ifbench": null,
          "lcr": null,
          "terminalbench_hard": null,
          "tau2": null
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.72,
          "price_1m_input_tokens": 0.72,
          "price_1m_output_tokens": 0.72
        },
        "median_output_tokens_per_second": 36.295,
        "median_time_to_first_token_seconds": 0.33,
        "median_time_to_first_answer_token": 0.33
      },
      {
        "id": "5fb47ff6-a30e-4c2c-96f2-55e95a13390f",
        "name": "Llama 3.2 Instruct 11B (Vision)",
        "slug": "llama-3-2-instruct-11b-vision",
        "release_date": "2024-09-25",
        "model_creator": {
          "id": "e1694725-0192-4e54-b1b8-c97e816c6cbe",
          "name": "Meta",
          "slug": "meta"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 15.5,
          "artificial_analysis_coding_index": 7.7,
          "artificial_analysis_math_index": 1.7,
          "mmlu_pro": 0.464,
          "gpqa": 0.221,
          "hle": 0.052,
          "livecodebench": 0.11,
          "scicode": 0.112,
          "math_500": 0.516,
          "aime": 0.093,
          "aime_25": 0.017,
          "ifbench": 0.304,
          "lcr": 0.117,
          "terminalbench_hard": 0.007,
          "tau2": 0.146
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.16,
          "price_1m_input_tokens": 0.16,
          "price_1m_output_tokens": 0.16
        },
        "median_output_tokens_per_second": 72.305,
        "median_time_to_first_token_seconds": 0.442,
        "median_time_to_first_answer_token": 0.442
      },
      {
        "id": "922c69c7-9037-43c6-8bcf-a1c555e7f3eb",
        "name": "Llama 4 Maverick",
        "slug": "llama-4-maverick",
        "release_date": "2025-04-05",
        "model_creator": {
          "id": "e1694725-0192-4e54-b1b8-c97e816c6cbe",
          "name": "Meta",
          "slug": "meta"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 35.8,
          "artificial_analysis_coding_index": 26.4,
          "artificial_analysis_math_index": 19.3,
          "mmlu_pro": 0.809,
          "gpqa": 0.671,
          "hle": 0.048,
          "livecodebench": 0.397,
          "scicode": 0.331,
          "math_500": 0.889,
          "aime": 0.39,
          "aime_25": 0.193,
          "ifbench": 0.43,
          "lcr": 0.46,
          "terminalbench_hard": 0.064,
          "tau2": 0.178
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.415,
          "price_1m_input_tokens": 0.25,
          "price_1m_output_tokens": 0.85
        },
        "median_output_tokens_per_second": 128.861,
        "median_time_to_first_token_seconds": 0.351,
        "median_time_to_first_answer_token": 0.351
      },
      {
        "id": "adf9a85e-abc3-4f28-937b-db6655cc5238",
        "name": "Llama 4 Scout",
        "slug": "llama-4-scout",
        "release_date": "2025-04-05",
        "model_creator": {
          "id": "e1694725-0192-4e54-b1b8-c97e816c6cbe",
          "name": "Meta",
          "slug": "meta"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 28.1,
          "artificial_analysis_coding_index": 16.1,
          "artificial_analysis_math_index": 14,
          "mmlu_pro": 0.752,
          "gpqa": 0.587,
          "hle": 0.043,
          "livecodebench": 0.299,
          "scicode": 0.17,
          "math_500": 0.844,
          "aime": 0.283,
          "aime_25": 0.14,
          "ifbench": 0.395,
          "lcr": 0.258,
          "terminalbench_hard": 0.014,
          "tau2": 0.155
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.241,
          "price_1m_input_tokens": 0.14,
          "price_1m_output_tokens": 0.545
        },
        "median_output_tokens_per_second": 118.194,
        "median_time_to_first_token_seconds": 0.564,
        "median_time_to_first_answer_token": 0.564
      },
      {
        "id": "2e6400f5-85ca-4ebc-ba8f-c2811a631138",
        "name": "Gemma 3 12B Instruct",
        "slug": "gemma-3-12b",
        "release_date": "2025-03-12",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 20.4,
          "artificial_analysis_coding_index": 10.6,
          "artificial_analysis_math_index": 18.3,
          "mmlu_pro": 0.595,
          "gpqa": 0.349,
          "hle": 0.048,
          "livecodebench": 0.137,
          "scicode": 0.174,
          "math_500": 0.853,
          "aime": 0.22,
          "aime_25": 0.183,
          "ifbench": 0.367,
          "lcr": 0.067,
          "terminalbench_hard": 0.007,
          "tau2": 0.108
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0,
          "price_1m_input_tokens": 0,
          "price_1m_output_tokens": 0
        },
        "median_output_tokens_per_second": 51.141,
        "median_time_to_first_token_seconds": 1.409,
        "median_time_to_first_answer_token": 1.409
      },
      {
        "id": "877fdfc9-2026-477a-af96-e4fd602c0131",
        "name": "Gemini 2.5 Flash Preview (Sep '25) (Non-reasoning)",
        "slug": "gemini-2-5-flash-preview-09-2025",
        "release_date": "2025-09-25",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 46.7,
          "artificial_analysis_coding_index": 37.8,
          "artificial_analysis_math_index": 56.7,
          "mmlu_pro": 0.836,
          "gpqa": 0.766,
          "hle": 0.078,
          "livecodebench": 0.625,
          "scicode": 0.375,
          "math_500": null,
          "aime": null,
          "aime_25": 0.567,
          "ifbench": 0.435,
          "lcr": 0.567,
          "terminalbench_hard": 0.135,
          "tau2": 0.284
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.85,
          "price_1m_input_tokens": 0.3,
          "price_1m_output_tokens": 2.5
        },
        "median_output_tokens_per_second": 232.989,
        "median_time_to_first_token_seconds": 0.301,
        "median_time_to_first_answer_token": 0.301
      },
      {
        "id": "222fb320-6e55-4672-846a-b6d5a24a45f4",
        "name": "Gemma 3 4B Instruct",
        "slug": "gemma-3-4b",
        "release_date": "2025-03-12",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 14.7,
          "artificial_analysis_coding_index": 6.4,
          "artificial_analysis_math_index": 12.7,
          "mmlu_pro": 0.417,
          "gpqa": 0.291,
          "hle": 0.052,
          "livecodebench": 0.112,
          "scicode": 0.073,
          "math_500": 0.766,
          "aime": 0.063,
          "aime_25": 0.127,
          "ifbench": 0.283,
          "lcr": 0.057,
          "terminalbench_hard": 0.007,
          "tau2": 0.05
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0,
          "price_1m_input_tokens": 0,
          "price_1m_output_tokens": 0
        },
        "median_output_tokens_per_second": 46.43,
        "median_time_to_first_token_seconds": 0.981,
        "median_time_to_first_answer_token": 0.981
      },
      {
        "id": "71f51ea9-94fe-4635-a80d-4cfffbb685f4",
        "name": "Gemini 2.5 Flash-Lite Preview (Sep '25) (Non-reasoning)",
        "slug": "gemini-2-5-flash-lite-preview-09-2025",
        "release_date": "2025-09-25",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 41.6,
          "artificial_analysis_coding_index": 33.2,
          "artificial_analysis_math_index": 46.7,
          "mmlu_pro": 0.796,
          "gpqa": 0.651,
          "hle": 0.046,
          "livecodebench": 0.641,
          "scicode": 0.285,
          "math_500": null,
          "aime": null,
          "aime_25": 0.467,
          "ifbench": 0.418,
          "lcr": 0.48,
          "terminalbench_hard": 0.071,
          "tau2": 0.304
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.175,
          "price_1m_input_tokens": 0.1,
          "price_1m_output_tokens": 0.4
        },
        "median_output_tokens_per_second": 550.309,
        "median_time_to_first_token_seconds": 0.2,
        "median_time_to_first_answer_token": 0.2
      },
      {
        "id": "84922739-425f-46e1-87ac-bb4268dcacbb",
        "name": "Gemini 2.5 Flash-Lite Preview (Sep '25) (Reasoning)",
        "slug": "gemini-2-5-flash-lite-preview-09-2025-reasoning",
        "release_date": "2025-09-08",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 47.9,
          "artificial_analysis_coding_index": 36.5,
          "artificial_analysis_math_index": 68.7,
          "mmlu_pro": 0.808,
          "gpqa": 0.709,
          "hle": 0.066,
          "livecodebench": 0.688,
          "scicode": 0.287,
          "math_500": null,
          "aime": null,
          "aime_25": 0.687,
          "ifbench": 0.526,
          "lcr": 0.59,
          "terminalbench_hard": 0.121,
          "tau2": 0.307
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.175,
          "price_1m_input_tokens": 0.1,
          "price_1m_output_tokens": 0.4
        },
        "median_output_tokens_per_second": 724.257,
        "median_time_to_first_token_seconds": 5.18,
        "median_time_to_first_answer_token": 5.18
      },
      {
        "id": "a8c67863-9d66-44dd-8d27-f58654ecde03",
        "name": "Gemma 3n E2B Instruct",
        "slug": "gemma-3n-e2b",
        "release_date": "2025-06-26",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 11.3,
          "artificial_analysis_coding_index": 5.2,
          "artificial_analysis_math_index": 10.3,
          "mmlu_pro": 0.378,
          "gpqa": 0.229,
          "hle": 0.04,
          "livecodebench": 0.095,
          "scicode": 0.052,
          "math_500": 0.691,
          "aime": 0.09,
          "aime_25": 0.103,
          "ifbench": 0.22,
          "lcr": 0,
          "terminalbench_hard": 0.007,
          "tau2": 0
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0,
          "price_1m_input_tokens": 0,
          "price_1m_output_tokens": 0
        },
        "median_output_tokens_per_second": 47.074,
        "median_time_to_first_token_seconds": 0.386,
        "median_time_to_first_answer_token": 0.386
      },
      {
        "id": "c7667559-d9b6-43f1-8cd8-8bdbc78d190b",
        "name": "Gemini 2.5 Flash Preview (Sep '25) (Reasoning)",
        "slug": "gemini-2-5-flash-preview-09-2025-reasoning",
        "release_date": "2025-09-25",
        "model_creator": {
          "id": "faddc6d9-2c14-445f-9b28-56726f59c793",
          "name": "Google",
          "slug": "google"
        },
        "evaluations": {
          "artificial_analysis_intelligence_index": 54.4,
          "artificial_analysis_coding_index": 42.5,
          "artificial_analysis_math_index": 78.3,
          "mmlu_pro": 0.842,
          "gpqa": 0.793,
          "hle": 0.127,
          "livecodebench": 0.713,
          "scicode": 0.405,
          "math_500": null,
          "aime": null,
          "aime_25": 0.783,
          "ifbench": 0.523,
          "lcr": 0.643,
          "terminalbench_hard": 0.156,
          "tau2": 0.456
        },
        "pricing": {
          "price_1m_blended_3_to_1": 0.85,
          "price_1m_input_tokens": 0.3,
          "price_1m_output_tokens": 2.5
        },
        "median_output_tokens_per_second": 264.072,
        "median_time_to_first_token_seconds": 8.202,
        "median_time_to_first_answer_token": 8.202
      }
    ]
  }
}