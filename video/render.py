"""MindLoop 2-minute product explainer. Flat candy style, animated with moviepy.
12 scenes x 10s = 120s. Captions carry the narration (no TTS dependency)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoClip, concatenate_videoclips

W, H, FPS = 1280, 720, 24
BG = (255, 248, 239)
INK = (38, 34, 28)
CORAL = (255, 77, 109)
TEAL = (14, 165, 164)
AMBER = (255, 176, 32)
BLUE = (59, 130, 246)
LEAF = (34, 197, 94)
PURPLE = (192, 38, 211)

try:
    FONT_B = ImageFont.truetype("arialbd.ttf", 64)
    FONT_M = ImageFont.truetype("arial.ttf", 34)
except OSError:
    FONT_B = ImageFont.load_default()
    FONT_M = FONT_B

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

SCENES = [
    # (bg, emoji, title, caption, accent)
    (BG, "Welcome to MindLoop", "Get your baseline done, then grow attention, focus - and doomscroll less.", CORAL),
    (BG, "Step 1 - Who are you?", "Name, age, gender, country. Thirty seconds - your baseline becomes truly yours.", TEAL),
    (BG, "Step 2 - 4 baseline games", "Vigilance Tap, Remember the Shelf, N-Back, Hold Steady. Your starting line.", BLUE),
    (BG, "Step 3 - Connect devices", "Smartwatch plus mobile. Sleep and screen-time shape the story around scores.", PURPLE),
    (BG, "Step 4 - Screen time", "Rough numbers are fine. Doomscroll minutes sit next to focus - never judgement.", AMBER),
    (BG, "Your buddy plan", "Five games plus one small habit every day. Day one: read a book, fifteen minutes.", LEAF),
    (BG, "Remember the Shelf", "Twenty seconds to memorize. Tap what was there - green means remembered!", CORAL),
    (BG, "Hold Steady", "Hold your phone still for thirty seconds. Steady hands, calm focused brain.", TEAL),
    (BG, "Missed a day?", "Totally okay. Your buddy says: try tomorrow. No streaks lost, no shame.", AMBER),
    (BG, "My Brain Story", "One button writes your report like a storybook - a ten-year-old can understand it.", BLUE),
    (BG, "Watch yourself grow", "A 0 to 100 index versus your own usual pattern. Never a diagnosis.", LEAF),
    (BG, "Start today", "MindLoop - know your focus, from your own data.", CORAL),
]

def frame(t, scene):
    bg, title, caption, accent = scene
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    strip = [CORAL, (249, 115, 22), AMBER, LEAF, TEAL, BLUE, PURPLE]
    sw = W // len(strip)
    for i, c in enumerate(strip):
        d.rectangle([i * sw, 0, (i + 1) * sw, 10], fill=c)
    pop = min(1.0, t / 0.5)
    y_off = int(30 * (1 - pop))
    tw = text_w(d, title, FONT_B)
    d.text(((W - tw) / 2, 220 + y_off), title, font=FONT_B, fill=accent)
    y = 340 + y_off
    for line in wrap(d, caption, FONT_M, W - 240):
        lw = text_w(d, line, FONT_M)
        d.text(((W - lw) / 2, y), line, font=FONT_M, fill=(107, 98, 87))
        y += 48
    idx = SCENES.index(scene)
    for i in range(len(SCENES)):
        x = W / 2 - len(SCENES) * 14 + i * 28
        d.ellipse([x, H - 60, x + 14, H - 46], fill=accent if i == idx else (240, 227, 205))
    return np.array(img)

def make_clip(scene, dur=10.0):
    return VideoClip(lambda t: frame(t, scene), duration=dur)

if __name__ == "__main__":
    clips = [make_clip(s) for s in SCENES]
    video = concatenate_videoclips(clips, method="compose")
    out = r"V:\iiui\VINSANE INNOVATIONS 1A\mindloop\video\mindloop-explainer.mp4"
    video.write_videofile(out, fps=FPS, codec="libx264",
                          ffmpeg_params=["-pix_fmt", "yuv420p"],
                          logger=None)
    print("wrote", out, video.duration, "s")
