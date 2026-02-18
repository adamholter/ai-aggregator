#!/usr/bin/env python3
"""
AI Timeline 2025 Video Renderer
Native Python renderer - no browser required

Renders a smooth scrolling timeline video with:
- Dynamic speed (slow at events, fast in gaps)
- High frame rate (60fps)  
- Proper card rendering with text
- Music track included
"""

import os
import subprocess
import tempfile
import shutil
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont
import json

# Video settings
WIDTH = 1920
HEIGHT = 1080
FPS = 60
DURATION_SECONDS = 90  # Target duration

# Timeline constants
PIXELS_PER_DAY = 280
START_DATE = datetime(2025, 1, 1)
CARD_WIDTH = 340
CARD_HEIGHT = 140
CARD_PADDING = 20

# Colors (warm, modern theme)
BG_COLOR = (250, 250, 250)  # Light gray background
AXIS_COLOR = (39, 39, 42)   # Dark zinc
CARD_BG = (255, 255, 255)   # White cards
CARD_BORDER = (212, 212, 216)
TEXT_PRIMARY = (39, 39, 42)
TEXT_SECONDARY = (113, 113, 122)
MONTH_COLORS = {
    1: (239, 68, 68),   # Red - January
    2: (249, 115, 22),  # Orange - February
    3: (234, 179, 8),   # Yellow - March
    4: (34, 197, 94),   # Green - April
    5: (6, 182, 212),   # Cyan - May
    6: (59, 130, 246),  # Blue - June
    7: (139, 92, 246),  # Violet - July
    8: (236, 72, 153),  # Pink - August
    9: (239, 68, 68),   # Red - September
    10: (249, 115, 22), # Orange - October
    11: (234, 179, 8),  # Yellow - November
    12: (34, 197, 94),  # Green - December
}

# Event data extracted from the timeline
EVENTS = [
    {"date": "2025-01-20", "title": "DeepSeek R1 Released", "score": 10, "desc": "Performance on par with OpenAI o1, but open-sourced."},
    {"date": "2025-01-23", "title": "OpenAI Operator", "score": 9, "desc": "Autonomous AI agent for complex tasks."},
    {"date": "2025-01-27", "title": "Luma Ray 2", "score": 8, "desc": "Video model with realistic natural motion."},
    {"date": "2025-01-31", "title": "OpenAI o3-mini", "score": 9, "desc": "Cost-efficient reasoning model for STEM."},
    {"date": "2025-02-05", "title": "Gemini 2.0 Pro", "score": 10, "desc": "Google's most powerful AI with Deep Think."},
    {"date": "2025-02-14", "title": "Kokoro TTS v1", "score": 7, "desc": "Fast, high-quality text-to-speech."},
    {"date": "2025-02-17", "title": "Grok 3 Released", "score": 9, "desc": "Trained on 100k H100s with DeepSearch."},
    {"date": "2025-02-24", "title": "Claude 3.7 Sonnet", "score": 10, "desc": "First true hybrid reasoning model."},
    {"date": "2025-02-26", "title": "Wan 2.1 Video", "score": 9, "desc": "Alibaba's fast, cost-effective video model."},
    {"date": "2025-03-05", "title": "Juggernaut Flux Pro", "score": 6, "desc": "Photorealistic fine-tune rivaling Midjourney."},
    {"date": "2025-03-12", "title": "Gemma 3 Multimodal", "score": 8, "desc": "Vision-language and audio support."},
    {"date": "2025-03-19", "title": "OpenAI o1-pro", "score": 9, "desc": "High-compute reasoning for complex problems."},
    {"date": "2025-03-24", "title": "DeepSeek V3 (0324)", "score": 8, "desc": "Optimized coding and logic."},
    {"date": "2025-04-01", "title": "Runway Gen-4", "score": 9, "desc": "Unmatched consistency with Director Mode."},
    {"date": "2025-04-05", "title": "Llama 4 Leaks", "score": 8, "desc": "Maverick and Scout variants revealed."},
    {"date": "2025-04-14", "title": "GPT-4.1 Family", "score": 9, "desc": "Major boost in instruction following."},
    {"date": "2025-04-16", "title": "OpenAI o4-mini", "score": 9, "desc": "Autonomous tool use in a small package."},
    {"date": "2025-04-30", "title": "Ideogram V3", "score": 8, "desc": "Text rendering perfected."},
    {"date": "2025-05-07", "title": "Gemini 2.5 Preview", "score": 9, "desc": "Advanced reasoning with Flash-Lite."},
    {"date": "2025-05-08", "title": "OpenAI Buys Windsurf", "score": 8, "desc": "$3B acquisition for developer IDE."},
    {"date": "2025-05-19", "title": "Google I/O: Flow", "score": 10, "desc": "Flow AI video editor with Veo 3."},
    {"date": "2025-05-22", "title": "Claude Opus 4", "score": 10, "desc": "World's best coding model."},
    {"date": "2025-05-28", "title": "DeepSeek R1 Update", "score": 8, "desc": "R1-0528 with reasoning improvements."},
    {"date": "2025-06-05", "title": "Veo 3 GA", "score": 9, "desc": "Native vertical video and 1080p."},
    {"date": "2025-06-10", "title": "OpenAI o3 Pro", "score": 9, "desc": "Multi-day research tasks."},
    {"date": "2025-06-17", "title": "MiniMax M1", "score": 8, "desc": "Open-weight with 4M token context."},
    {"date": "2025-06-30", "title": "Claude Sonnet 4", "score": 9, "desc": "Enhanced reasoning capabilities."},
    {"date": "2025-07-15", "title": "GPT-5 Preview", "score": 10, "desc": "Next-gen language model preview."},
    {"date": "2025-07-17", "title": "Stable Video 2", "score": 8, "desc": "Open-source video generation."},
    {"date": "2025-07-23", "title": "Llama 4 Official", "score": 9, "desc": "Meta's multimodal release."},
    {"date": "2025-07-25", "title": "GLM 4.5", "score": 8, "desc": "Zhipu's flagship model."},
    {"date": "2025-08-05", "title": "Gemini 3 Preview", "score": 10, "desc": "Google's next-gen AI."},
    {"date": "2025-08-07", "title": "Mistral Large 3", "score": 8, "desc": "European frontier model."},
    {"date": "2025-08-26", "title": "Claude 4 Opus Update", "score": 9, "desc": "Extended context and tools."},
    {"date": "2025-09-01", "title": "Video AI Wave", "score": 9, "desc": "Multiple video model releases."},
    {"date": "2025-09-17", "title": "GPT-5 Beta", "score": 10, "desc": "Public beta access."},
    {"date": "2025-09-23", "title": "Sora 2", "score": 9, "desc": "OpenAI's next video model."},
    {"date": "2025-09-30", "title": "Anthropic Tools", "score": 8, "desc": "New tool use capabilities."},
    {"date": "2025-10-06", "title": "Gemini 3 Flash", "score": 9, "desc": "Efficient high-performance."},
    {"date": "2025-10-15", "title": "Grok 4", "score": 9, "desc": "xAI's flagship release."},
    {"date": "2025-10-20", "title": "Midjourney V7", "score": 8, "desc": "Enhanced image generation."},
    {"date": "2025-11-13", "title": "Claude 5 Preview", "score": 10, "desc": "Anthropic's next generation."},
    {"date": "2025-11-18", "title": "GPT-5 Launch", "score": 10, "desc": "Full public release."},
    {"date": "2025-11-24", "title": "DeepSeek R2", "score": 9, "desc": "Next-gen open reasoning."},
    {"date": "2025-12-01", "title": "Video AI Wave", "score": 8, "desc": "Year-end video releases."},
    {"date": "2025-12-10", "title": "OpenAI GPT-5.2", "score": 9, "desc": "Adaptive reasoning update."},
    {"date": "2025-12-11", "title": "Gemini 3 Flash", "score": 9, "desc": "Powers Antigravity editor."},
    {"date": "2025-12-19", "title": "GPT-5.2-Codex", "score": 8, "desc": "Long-horizon agentic coding."},
    {"date": "2025-12-20", "title": "Anthropic Bloom", "score": 7, "desc": "Open-source evaluation tool."},
    {"date": "2025-12-22", "title": "Z.AI GLM 4.7", "score": 9, "desc": "Smartest open-source by benchmarks."},
    {"date": "2025-12-23", "title": "MiniMax M2.1", "score": 9, "desc": "Open-weight frontier model."},
]

def date_to_x(date_str):
    """Convert date string to X pixel position."""
    event_date = datetime.strptime(date_str, "%Y-%m-%d")
    days = (event_date - START_DATE).days
    return 400 + (days * PIXELS_PER_DAY)

def get_font(size, bold=False):
    """Get a font, with fallbacks."""
    font_names = [
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/Helvetica.ttc", 
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for font_name in font_names:
        if os.path.exists(font_name):
            try:
                return ImageFont.truetype(font_name, size)
            except:
                pass
    return ImageFont.load_default()

def draw_card(draw, x, y, event, fonts):
    """Draw a single event card."""
    month = datetime.strptime(event["date"], "%Y-%m-%d").month
    accent_color = MONTH_COLORS.get(month, (59, 130, 246))
    
    # Card shadow
    for offset in range(3, 0, -1):
        shadow_alpha = 20
        draw.rounded_rectangle(
            [x + offset, y + offset, x + CARD_WIDTH + offset, y + CARD_HEIGHT + offset],
            radius=12,
            fill=(200, 200, 200)
        )
    
    # Card background
    draw.rounded_rectangle(
        [x, y, x + CARD_WIDTH, y + CARD_HEIGHT],
        radius=12,
        fill=CARD_BG,
        outline=CARD_BORDER,
        width=1
    )
    
    # Accent bar on left
    draw.rectangle(
        [x, y + 12, x + 4, y + CARD_HEIGHT - 12],
        fill=accent_color
    )
    
    # Date
    date_obj = datetime.strptime(event["date"], "%Y-%m-%d")
    date_text = date_obj.strftime("%b %d")
    draw.text((x + 16, y + 12), date_text, font=fonts["small"], fill=TEXT_SECONDARY)
    
    # Score badge
    score = event.get("score", 5)
    badge_x = x + CARD_WIDTH - 40
    draw.ellipse([badge_x, y + 8, badge_x + 30, y + 38], fill=accent_color)
    draw.text((badge_x + 8, y + 12), str(score), font=fonts["small_bold"], fill=(255, 255, 255))
    
    # Title
    title = event["title"]
    if len(title) > 25:
        title = title[:24] + "..."
    draw.text((x + 16, y + 38), title, font=fonts["title"], fill=TEXT_PRIMARY)
    
    # Description (wrap if needed)
    desc = event.get("desc", "")
    if len(desc) > 55:
        desc = desc[:54] + "..."
    draw.text((x + 16, y + 72), desc, font=fonts["body"], fill=TEXT_SECONDARY)

def draw_timeline_axis(draw, scroll_x, fonts):
    """Draw the timeline axis with month markers."""
    y_axis = HEIGHT // 2 + 200
    
    # Axis line
    draw.line([(0, y_axis), (WIDTH, y_axis)], fill=AXIS_COLOR, width=2)
    
    # Month markers
    for month in range(1, 13):
        month_date = datetime(2025, month, 1)
        x = date_to_x(month_date.strftime("%Y-%m-%d")) - scroll_x
        
        if -100 < x < WIDTH + 100:
            # Month marker
            draw.line([(x, y_axis - 15), (x, y_axis + 15)], fill=AXIS_COLOR, width=2)
            
            # Month label
            month_name = month_date.strftime("%B")
            color = MONTH_COLORS.get(month, AXIS_COLOR)
            draw.text((x + 10, y_axis + 25), month_name, font=fonts["month"], fill=color)

def render_frame(scroll_x, fonts):
    """Render a single frame at the given scroll position."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.text((60, 40), "2025 AI Timeline", font=fonts["header"], fill=TEXT_PRIMARY)
    draw.text((60, 95), "A Year of Breakthroughs", font=fonts["subheader"], fill=TEXT_SECONDARY)
    
    # Draw axis
    draw_timeline_axis(draw, scroll_x, fonts)
    
    # Draw visible cards
    lanes = [[], [], []]  # 3 lanes for cards
    
    for event in EVENTS:
        x = date_to_x(event["date"]) - scroll_x
        
        # Only render visible cards
        if -CARD_WIDTH < x < WIDTH + CARD_WIDTH:
            # Find lane with least overlap
            best_lane = 0
            min_overlap = float('inf')
            
            for lane_idx, lane in enumerate(lanes):
                overlap = 0
                for other_x in lane:
                    if abs(x - other_x) < CARD_WIDTH + 20:
                        overlap += 1
                if overlap < min_overlap:
                    min_overlap = overlap
                    best_lane = lane_idx
            
            lanes[best_lane].append(x)
            
            # Calculate Y position based on lane
            base_y = 180
            lane_spacing = CARD_HEIGHT + 30
            y = base_y + (best_lane * lane_spacing)
            
            draw_card(draw, x, y, event, fonts)
    
    return img

def calculate_scroll_speeds():
    """Calculate scroll positions with dynamic speed."""
    # Get all event X positions
    event_positions = sorted([date_to_x(e["date"]) for e in EVENTS])
    
    first_event = event_positions[0]
    last_event = event_positions[-1]
    
    # Start slightly before first event
    start_x = max(0, first_event - WIDTH // 2 - 100)
    # End slightly after last event  
    end_x = last_event + 200
    
    total_distance = end_x - start_x
    
    # Build scroll positions with variable speed
    positions = []
    current_x = start_x
    
    SLOW_SPEED = 8     # Pixels per frame near events
    FAST_SPEED = 60    # Pixels per frame in gaps
    SLOW_ZONE = 500    # Slow down within this distance of events
    
    while current_x < end_x:
        positions.append(current_x)
        
        # Check if near any event
        near_event = any(abs(current_x + WIDTH//2 - ex) < SLOW_ZONE for ex in event_positions)
        speed = SLOW_SPEED if near_event else FAST_SPEED
        
        current_x += speed
    
    # Add final position
    positions.append(end_x)
    
    return positions

def main():
    print("🎬 AI Timeline 2025 - Native Video Renderer")
    print("=" * 50)
    
    # Create output directory
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    # Create temp directory for frames
    temp_dir = tempfile.mkdtemp(prefix="timeline_frames_")
    print(f"📁 Temp frames: {temp_dir}")
    
    # Load fonts
    print("🔤 Loading fonts...")
    fonts = {
        "header": get_font(48),
        "subheader": get_font(24),
        "title": get_font(22),
        "body": get_font(16),
        "small": get_font(14),
        "small_bold": get_font(14),
        "month": get_font(18),
    }
    
    # Calculate scroll positions
    print("📐 Calculating scroll positions...")
    scroll_positions = calculate_scroll_speeds()
    total_frames = len(scroll_positions)
    
    print(f"🎥 Rendering {total_frames} frames at {FPS}fps...")
    print(f"⏱️  Estimated duration: {total_frames / FPS:.1f} seconds")
    
    # Render frames
    for i, scroll_x in enumerate(scroll_positions):
        frame = render_frame(scroll_x, fonts)
        frame_path = os.path.join(temp_dir, f"frame_{i:06d}.png")
        frame.save(frame_path, "PNG")
        
        if (i + 1) % 100 == 0 or i == total_frames - 1:
            progress = (i + 1) / total_frames * 100
            print(f"  📍 {progress:.1f}% - Frame {i + 1}/{total_frames}")
    
    print("✅ Frames rendered!")
    
    # Encode video with ffmpeg
    print("🎬 Encoding video...")
    
    output_path = os.path.join(output_dir, "ai-timeline-2025-native.mp4")
    audio_url = "https://adam.holter.com/wp-content/uploads/2025/12/AI-Timeline.mp3"
    
    # ffmpeg command
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(temp_dir, "frame_%06d.png"),
        "-i", audio_url,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    
    # Cleanup temp frames
    print("🧹 Cleaning up temp files...")
    shutil.rmtree(temp_dir)
    
    # Report results
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    duration = total_frames / FPS
    
    print()
    print("=" * 50)
    print("✅ VIDEO COMPLETE!")
    print("=" * 50)
    print(f"📁 Output: {output_path}")
    print(f"📊 Size: {file_size:.1f} MB")
    print(f"⏱️  Duration: {duration:.1f} seconds")
    print(f"🎥 Frames: {total_frames} @ {FPS}fps")
    print()
    print(f"▶️  Open with: open \"{output_path}\"")

if __name__ == "__main__":
    main()
