// Timeline Video Recorder v4
// Dynamic speed: slows down at events, speeds up in gaps
// 60fps for post-production flexibility
// No blank intro - starts at first event

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Event dates from the timeline (extracted from the HTML)
const EVENT_DATES = [
    "2025-01-20", "2025-01-23", "2025-01-27", "2025-01-31",
    "2025-02-05", "2025-02-14", "2025-02-17", "2025-02-24", "2025-02-26",
    "2025-03-05", "2025-03-12", "2025-03-19", "2025-03-24",
    "2025-04-01", "2025-04-05", "2025-04-14", "2025-04-16", "2025-04-30",
    "2025-05-07", "2025-05-08", "2025-05-19", "2025-05-22", "2025-05-28",
    "2025-06-05", "2025-06-10", "2025-06-17", "2025-06-30",
    "2025-07-15", "2025-07-17", "2025-07-23", "2025-07-25",
    "2025-08-05", "2025-08-07", "2025-08-26",
    "2025-09-01", "2025-09-17", "2025-09-23", "2025-09-30",
    "2025-10-06", "2025-10-15", "2025-10-20",
    "2025-11-13", "2025-11-18", "2025-11-24",
    "2025-12-01", "2025-12-10", "2025-12-11", "2025-12-19", "2025-12-20",
    "2025-12-22", "2025-12-23"  // GLM 4.7 and MiniMax M2.1
];

// Convert date to pixel position (same formula as timeline)
const PIXELS_PER_DAY = 280;
const START_OFFSET = 400;

function dateToPixels(dateStr) {
    const startDate = new Date(2025, 0, 1);
    const eventDate = new Date(dateStr);
    const dayDiff = (eventDate - startDate) / (1000 * 60 * 60 * 24);
    return START_OFFSET + (dayDiff * PIXELS_PER_DAY);
}

// Get all event positions
const EVENT_POSITIONS = EVENT_DATES.map(dateToPixels).sort((a, b) => a - b);

// Check if a position is near an event (within SLOW_ZONE pixels)
const SLOW_ZONE = 600; // Slow down within 600px of any event
function isNearEvent(scrollPos, viewportWidth) {
    const centerPos = scrollPos + viewportWidth / 2;
    return EVENT_POSITIONS.some(eventPos => Math.abs(eventPos - centerPos) < SLOW_ZONE);
}

async function recordTimeline() {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🎬 Starting Timeline Video Recorder v4 (Dynamic Speed)...');
    console.log('📁 Output directory:', outputDir);
    console.log(`📍 ${EVENT_POSITIONS.length} events to highlight`);

    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: {
            dir: outputDir,
            size: { width: 1920, height: 1080 }
        }
    });

    const page = await context.newPage();

    const timelineFile = path.join(__dirname, '..', 'static', 'ai-timeline-2025.html');
    console.log('📄 Loading timeline from:', timelineFile);

    await page.goto(`file://${timelineFile}`, {
        waitUntil: 'networkidle',
        timeout: 60000
    });

    console.log('⏳ Waiting for React to render...');
    await page.waitForTimeout(3000);

    // Get viewport info
    const viewportInfo = await page.evaluate(() => {
        const viewport = document.querySelector('.overflow-x-auto');
        if (!viewport) return null;
        return {
            scrollWidth: viewport.scrollWidth,
            clientWidth: viewport.clientWidth
        };
    });

    if (!viewportInfo) {
        console.log('❌ Could not find timeline viewport');
        await context.close();
        await browser.close();
        return;
    }

    const totalScrollDistance = viewportInfo.scrollWidth - viewportInfo.clientWidth;
    console.log(`📐 Timeline: ${viewportInfo.scrollWidth}px wide, scrolling ${totalScrollDistance}px`);

    // Start at first event position minus a bit of padding
    const firstEventPos = EVENT_POSITIONS[0];
    const startPos = Math.max(0, firstEventPos - viewportInfo.clientWidth / 2 - 200);

    console.log(`🚀 Starting at position ${startPos.toFixed(0)}px (first event at ${firstEventPos.toFixed(0)}px)`);

    // Jump to start position immediately (no recording of blank space)
    await page.evaluate((pos) => {
        const viewport = document.querySelector('.overflow-x-auto');
        if (viewport) viewport.scrollLeft = pos;
    }, startPos);

    await page.waitForTimeout(500);

    // Speed settings
    const SLOW_SPEED = 15;   // pixels per frame when near events (readable)
    const FAST_SPEED = 120;  // pixels per frame in gaps (fast forward)
    const FPS = 60;
    const FRAME_MS = 1000 / FPS; // ~16.67ms

    console.log(`⚙️ Dynamic speed: ${SLOW_SPEED}px/frame (slow) / ${FAST_SPEED}px/frame (fast)`);
    console.log(`🎥 Recording at ${FPS}fps`);

    console.log('🎬 Starting dynamic scroll recording...');

    const startTime = Date.now();
    let currentScroll = startPos;
    let frameCount = 0;
    let slowFrames = 0;
    let fastFrames = 0;

    while (currentScroll < totalScrollDistance) {
        const nearEvent = isNearEvent(currentScroll, viewportInfo.clientWidth);
        const speed = nearEvent ? SLOW_SPEED : FAST_SPEED;

        if (nearEvent) slowFrames++; else fastFrames++;

        currentScroll += speed;
        if (currentScroll > totalScrollDistance) currentScroll = totalScrollDistance;

        await page.evaluate((scrollPos) => {
            const viewport = document.querySelector('.overflow-x-auto');
            if (viewport) viewport.scrollLeft = scrollPos;
        }, currentScroll);

        await page.waitForTimeout(FRAME_MS);
        frameCount++;

        // Progress every 300 frames (~5 seconds at 60fps)
        if (frameCount % 300 === 0) {
            const progress = (currentScroll / totalScrollDistance * 100).toFixed(1);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const mode = nearEvent ? '🐢 SLOW' : '🚀 FAST';
            console.log(`📍 ${progress}% | ${elapsed}s | Frame ${frameCount} | ${mode}`);
        }
    }

    // Brief pause at the end
    console.log('⏸️ Final pause (2 seconds)...');
    await page.waitForTimeout(2000);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Recording complete: ${totalTime}s, ${frameCount} frames`);
    console.log(`   Slow frames: ${slowFrames} | Fast frames: ${fastFrames}`);

    console.log('🛑 Finalizing video...');

    await context.close();
    await browser.close();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find and rename video
    const files = fs.readdirSync(outputDir);
    const videoFiles = files.filter(f => f.endsWith('.webm')).map(f => ({
        name: f,
        mtime: fs.statSync(path.join(outputDir, f)).mtime
    })).sort((a, b) => b.mtime - a.mtime);

    if (videoFiles.length > 0) {
        const newestVideo = videoFiles[0].name;
        const sourcePath = path.join(outputDir, newestVideo);
        const webmPath = path.join(outputDir, 'ai-timeline-2025-v4.webm');

        if (sourcePath !== webmPath) {
            if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath);
            fs.renameSync(sourcePath, webmPath);
        }

        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log('✅ WEBM READY - Now converting to MP4 with audio...');
        console.log('═══════════════════════════════════════════════');
        console.log('📁 WebM:', webmPath);
        console.log('📊 Size:', (fs.statSync(webmPath).size / 1024 / 1024).toFixed(2), 'MB');
    } else {
        console.log('❌ No video file found');
    }

    console.log('');
    console.log('🎉 Done! Run ffmpeg separately to add audio.');
}

recordTimeline().catch(console.error);
