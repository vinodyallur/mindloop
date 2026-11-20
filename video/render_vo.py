"""MindLoop explainer v2 with voiceover. Each scene lasts as long as its
narration (sped up to 1.25x max to stay near 10s), captions shown throughout."""
import glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoClip, AudioFileClip, concatenate_videoclips

W, H, FPS = 1280, 720, 24
BG = (255, 248, 239)
CORAL = (255, 77, 109)
TEAL = (14, 165, 164)
AMBER = (255, 176, 32)
BLUE = (59, 130, 246)
LEAF = (34, 197, 94)
PURPLE = (192, 38, 211)
MUTED = (107, 98, 87)

try:
    FONT_B = ImageFont.truetype("arialbd.ttf", 60)
    FONT_M = ImageFont.truetype("arial.ttf", 32)
except OSError:
    FONT_B = ImageFont.load_default()
    FONT_M = FONT_B

TITLES = [
    "Welcome to MindLoop",
    "Step 1 - Who are you?",
    "Step 2 - 4 baseline games",
    "Step 3 - Connect devices",
    "Step 4 - Screen time",
    "Your buddy plan",
    "Remember the Shelf",
    "Hold Steady",
    "Missed a day?",
    "My Brain Story",
    "Watch yourself grow",
    "Start today",
]
ACCENTS = [CORAL, TEAL, BLUE, PURPLE, AMBER, LEAF, CORAL, TEAL, AMBER, BLUE, LEAF, CORAL]
CAPTIONS = [
    "Get your baseline done, then grow attention, focus - and doomscroll less.",
    "Name, age, gender, country. Thirty seconds - your baseline becomes truly yours.",
    "Vigilance Tap, Remember the Shelf, N-Back, Hold Steady. Your starting line.",
    "Smartwatch plus mobile. Sleep and screen-time shape the story around scores.",
    "Rough numbers are fine. Doomscroll minutes sit next to focus - never judgement.",
    "Five games plus one small habit every day. Day one: read a book, fifteen minutes.",
    "Twenty seconds to memorize. Tap what was there - green means remembered!",
    "Hold your phone still for thirty seconds. Steady hands, calm focused brain.",
    "Totally okay. Your buddy says: try tomorrow. No streaks lost, no shame.",
    "One button writes your report like a storybook - a ten-year-old can understand it.",
    "A 0 to 100 index versus your own usual pattern. Never a diagnosis.",
    "MindLoop - know your focus, from your own data.",
]

def text_w(draw, s, font):
    b = draw.textbbox((0, 0), s, font=font)
    return b[2] - b[0]

def wrap(draw, s, font, max_w):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if text_w(draw, t, font) <= max_w:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines

def frame(t, i, dur):
    title, caption, accent = TITLES[i], CAPTIONS[i], ACCENTS[i]
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    strip = [CORAL, (249, 115, 22), AMBER, LEAF, TEAL, BLUE, PURPLE]
    sw = W // len(strip)
    for j, c in enumerate(strip):
        d.rectangle([j * sw, 0, (j + 1) * sw, 10], fill=c)
    pop = min(1.0, t / 0.5)
    y_off = int(30 * (1 - pop))
    tw = text_w(d, title, FONT_B)
    d.text(((W - tw) / 2, 200 + y_off), title, font=FONT_B, fill=accent)
    y = 320 + y_off
    for line in wrap(d, caption, FONT_M, W - 240):
        lw = text_w(d, line, FONT_M)
        d.text(((W - lw) / 2, y), line, font=FONT_M, fill=MUTED)
        y += 46
    # speaking indicator + progress
    el = 1 + 0.15 * abs(np.sin(t * 6))
    cx = 90
    d.ellipse([cx - 22 * el, H - 110, cx + 22 * el, H - 66], fill=accent)
    d.text((cx + 34, H - 100), "Narrating...", font=FONT_M, fill=MUTED)
    for j in range(len(TITLES)):
        x = W / 2 - len(TITLES) * 14 + j * 28
        d.ellipse([x, H - 60, x + 14, H - 46], fill=ACCENTS[j] if j == i else (240, 227, 205))
    # scene progress bar
    d.rectangle([0, H - 8, W * min(1, t / dur), H], fill=accent)
    return np.array(img)

if __name__ == "__main__":
    files = sorted(glob.glob(r"V:\iiui\VINSANE INNOVATIONS 1A\mindloop\video\vo_*.mp3"))
    assert len(files) == 12, files
    clips = []
    total = 0.0
    for i, f in enumerate(files):
        audio = AudioFileClip(f)
        dur = audio.duration
        if dur > 12:
            audio = audio.with_speed_scaled(1.25)
            dur = audio.duration
        dur = max(dur + 0.6, 4.0)  # breathing room
        clip = VideoClip(lambda t, i=i, dur=dur: frame(t, i, dur), duration=dur).with_audio(audio)
        clips.append(clip)
        total += dur
    video = concatenate_videoclips(clips, method="compose")
    out = r"V:\iiui\VINSANE INNOVATIONS 1A\mindloop\video\mindloop-explainer-vo.mp4"
    video.write_videofile(out, fps=FPS, codec="libx264", audio_codec="aac",
                          ffmpeg_params=["-pix_fmt", "yuv420p"], logger=None)
    print("wrote", out, round(video.duration, 1), "s")
