"""MindLoop final explainer: 12 scenes, paced to voiceover (~10s each)."""
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
    FONT_B = ImageFont.truetype("arialbd.ttf", 58)
    FONT_M = ImageFont.truetype("arial.ttf", 31)
except OSError:
    FONT_B = ImageFont.load_default()
    FONT_M = FONT_B

TITLES = [
    "Your attention is leaking",
    "Nobody connects the picture",
    "A real assessment",
    "Thirty games, one baseline",
    "You vs yesterday's you",
    "Your buddy plan",
    "Screen time, with context",
    "A storybook report",
    "Built responsibly",
    "Proof over promises",
    "Start today",
    "MindLoop",
]
ACCENTS = [CORAL, CORAL, BLUE, TEAL, LEAF, AMBER, PURPLE, BLUE, TEAL, LEAF, CORAL, CORAL]
CAPTIONS = [
    "Get your baseline done, then grow it — game by game.",
    "Brain games hype IQ. Dashboards show hours. Nobody links play, sleep, scroll, feel.",
    "Vigilance Tap · Remember the Shelf · Schulte 25 · Habits quiz. Ten minutes.",
    "Orbit rebels · Schulte grids · Hold Steady gyro. Every tap feeds one baseline.",
    "0 to 100 vs your own usual. Never a label, never a diagnosis.",
    "Five games plus one small habit daily. Miss a day? Try tomorrow. No shame.",
    "Doomscroll minutes sit next to focus scores — context, never judgement.",
    "Coordination, attention, focus — written so simply a ten-year-old gets it.",
    "Human review, tracked referrals, shown reasoning. Twenty languages.",
    "Near-transfer honesty. Validated scales. A model card anyone can read.",
    "Thirty-second form. Four games. Watch your baseline come alive.",
    "Know your focus, from your own data.",
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
    el = 1 + 0.15 * abs(np.sin(t * 6))
    cx = 90
    d.ellipse([cx - 22 * el, H - 110, cx + 22 * el, H - 66], fill=accent)
    d.text((cx + 34, H - 100), "Narrating...", font=FONT_M, fill=MUTED)
    for j in range(len(TITLES)):
        x = W / 2 - len(TITLES) * 14 + j * 28
        d.ellipse([x, H - 60, x + 14, H - 46], fill=ACCENTS[j] if j == i else (240, 227, 205))
    d.rectangle([0, H - 8, W * min(1, t / dur), H], fill=accent)
    return np.array(img)

if __name__ == "__main__":
    files = sorted(glob.glob(r"V:\iiui\VINSANE INNOVATIONS 1A\mindloop\video\final_*.mp3"))
    assert len(files) == 12, files
    clips = []
    for i, f in enumerate(files):
        audio = AudioFileClip(f)
        if audio.duration > 11:
            audio = audio.with_speed_scaled(1.35)
        dur = audio.duration + 0.6
        clip = VideoClip(lambda t, i=i, dur=dur: frame(t, i, dur), duration=dur).with_audio(audio)
        clips.append(clip)
    video = concatenate_videoclips(clips, method="compose")
    out = r"V:\iiui\VINSANE INNOVATIONS 1A\mindloop\video\mindloop-final-2min.mp4"
    video.write_videofile(out, fps=FPS, codec="libx264", audio_codec="aac",
                          ffmpeg_params=["-pix_fmt", "yuv420p"], logger=None)
    print("wrote", out, round(video.duration, 1), "s")
