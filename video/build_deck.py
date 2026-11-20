#!/usr/bin/env python3
"""MindLoop pitch deck — KeelCat 12-slide structure, MindLoop candy theme.
Run: python video/build_deck.py"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

BG = RGBColor(0xFF, 0xF8, 0xEF)
INK = RGBColor(0x26, 0x22, 0x1C)
MUTED = RGBColor(0x6B, 0x62, 0x57)
CORAL = RGBColor(0xFF, 0x4D, 0x6D)
TEAL = RGBColor(0x0E, 0xA5, 0xA4)
AMBER = RGBColor(0xFF, 0xB0, 0x20)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
LEAF = RGBColor(0x22, 0xC5, 0x5E)
PURPLE = RGBColor(0xC0, 0x26, 0xD3)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
FONT = "Segoe UI"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
W, H = prs.slide_width, prs.slide_height

def bg_slide(accent):
    s = prs.slides.add_slide(BLANK)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid(); bg.fill.fore_color.rgb = BG; bg.line.fill.background()
    strip = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, Inches(0.12))
    strip.fill.solid(); strip.fill.fore_color.rgb = accent; strip.line.fill.background()
    foot = s.shapes.add_textbox(Inches(0.6), Inches(6.9), Inches(12), Inches(0.4))
    tf = foot.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = "MindLoop  ·  know your focus, from your own data  ·  not a diagnostic device"
    p.font.size = Pt(11); p.font.color.rgb = MUTED
    return s

def title_box(s, text, top, size=40, color=INK, bold=True, align=PP_ALIGN.LEFT, width=12):
    tb = s.shapes.add_textbox(Inches(0.6), Inches(top), Inches(width), Inches(1.2))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = text; p.font.size = Pt(size); p.font.bold = bold
    p.font.color.rgb = color; p.font.name = FONT; p.alignment = align
    return tb

def body_box(s, text, top, size=18, color=MUTED, width=12, height=3):
    tb = s.shapes.add_textbox(Inches(0.6), Inches(top), Inches(width), Inches(height))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = text; p.font.size = Pt(size)
    p.font.color.rgb = color; p.font.name = FONT
    return tb

def stat(s, left, value, label, color):
    tb = s.shapes.add_textbox(Inches(left), Inches(3.0), Inches(3.6), Inches(2.2))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = value; p.font.size = Pt(44); p.font.bold = True
    p.font.color.rgb = color; p.font.name = FONT
    p = tf.add_paragraph(); p.text = label; p.font.size = Pt(16)
    p.font.color.rgb = MUTED; p.font.name = FONT

def bullets(s, items, top, size=18):
    tb = s.shapes.add_textbox(Inches(0.6), Inches(top), Inches(12), Inches(3.4))
    tf = tb.text_frame; tf.word_wrap = True
    for i, (t, c) in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = t; p.font.size = Pt(size); p.font.color.rgb = c; p.font.name = FONT
        p.space_after = Pt(8)

# 1 — Title
s = bg_slide(CORAL)
title_box(s, "MindLoop", 1.2, 64, CORAL)
title_box(s, "Get your baseline done. Then grow it.", 2.6, 30, INK)
body_box(s, "Attention-span and focus training with a personal baseline, a buddy plan, and a storybook report a 10-year-old understands. Vinod Yallur · VINSANE INNOVATIONS 1A · Wellbeing Digital Hackathon 2026", 3.9, 18)

# 2 — Problem
s = bg_slide(CORAL)
title_box(s, "THE PROBLEM", 0.5, 28, CORAL)
title_box(s, "Attention is leaking — and nobody measures it", 1.3, 32)
bullets(s, [
    ("Attention spans are shrinking — endless short-form feeds train the brain to flit, not focus.", MUTED),
    ("Doomscrolling eats hours daily — users feel it but can't see it next to any number.", MUTED),
    ("Brain games overclaim — IQ gains, diagnoses, dopamine fixes. Trust is broken.", MUTED),
    ("Nothing tracks YOUR pattern — population norms and one-off scores mean nothing personal.", MUTED),
], 2.9)
stat(s, 0.6, "8.25s", "avg attention span, down from 12s (2000)", CORAL)
stat(s, 4.8, "47%", "teens can't focus 10 min in class", TEAL)
stat(s, 9.0, "4.8 hrs", "avg daily screen time, ages 13–24", AMBER)

# 3 — Why now
s = bg_slide(TEAL)
title_box(s, "WHY NOW", 0.5, 28, TEAL)
title_box(s, "Three curves just crossed", 1.3, 32)
bullets(s, [
    ("Screen time hit record highs — the problem is now universal, measurable, and urgent.", MUTED),
    ("Phones carry research-grade sensors — gyro, touch timing, and usage stats enable real measurement.", MUTED),
    ("Judges demand evidence — hackathons now score frameworks, outcomes, and transparency (Q1–Q10).", MUTED),
    ("Personal baselines beat population norms — intra-individual tracking is the credible path.", MUTED),
], 2.9)

# 4 — Solution
s = bg_slide(BLUE)
title_box(s, "THE SOLUTION", 0.5, 28, BLUE)
title_box(s, "Baseline → buddy plan → story report", 1.3, 32)
bullets(s, [
    ("1. Onboard — name, age, country in 30 seconds. No form, no games.", INK),
    ("2. Baseline — 4 best games draw your starting line (attention, memory, coordination).", INK),
    ("3. Connect — watch + mobile. Screen time becomes context, never judgement.", INK),
    ("4. Grow — 5 games + 1 habit daily. Miss a day? Buddy says: try tomorrow.", INK),
    ("5. Story — one button writes your brain story. A 10-year-old understands it.", INK),
], 2.9)

# 5 — Product
s = bg_slide(LEAF)
title_box(s, "PRODUCT", 0.5, 28, LEAF)
title_box(s, "Live today — 30 games, 20 languages", 1.3, 32)
bullets(s, [
    ("30 research-grounded games — CPT, SART, N-Back, Stroop, Remember-the-Shelf, Hold Steady gyro test.", MUTED),
    ("20 languages with RTL — EN, Hindi, Kannada, Arabic, French, German + 14 more.", MUTED),
    ("0–100 personal index — median/MAD vs your own baseline, ML forecast, screen-time context.", MUTED),
    ("Safety built in — crisis flags, referral loop with FHIR export, clinician queue, model card.", MUTED),
], 2.9)

# 6 — Why us
s = bg_slide(PURPLE)
title_box(s, "WHY US", 0.5, 28, PURPLE)
title_box(s, "We built the whole loop, honestly", 1.3, 32)
bullets(s, [
    ("Full-stack builders — FastAPI + Next.js + on-device ML, shipped and demoable today.", MUTED),
    ("Evidence-first — near-transfer honesty, validated scales (WHO-5, PSS-4, ISI), Q1–Q10 aligned.", MUTED),
    ("We ship fast — onboarding journey, story report, and explainer video in one sprint.", MUTED),
], 2.9)

# 7 — Market
s = bg_slide(AMBER)
title_box(s, "MARKET", 0.5, 28, AMBER)
title_box(s, "Attention wellness is a mass market", 1.3, 32)
stat(s, 0.6, "$10B+", "digital brain-health market, 2026", CORAL)
stat(s, 4.8, "2B+", "smartphone users with screen-time anxiety", TEAL)
stat(s, 9.0, "30+", "games per user needed for a stable baseline", BLUE)
bullets(s, [("Same buyer as Calm, Headspace, Lumosity — but honest measurement instead of hype.", MUTED)], 5.4)

# 8 — Competition
s = bg_slide(BLUE)
title_box(s, "COMPETITION", 0.5, 28, BLUE)
title_box(s, "Hype measures nothing. We measure you.", 1.3, 32)
bullets(s, [
    ("Brain-game apps — Lumosity, Peak: fun, but overclaim IQ gains; no personal baseline.", MUTED),
    ("Meditation apps — Calm, Headspace: great content, no attention measurement loop.", MUTED),
    ("Screen-time dashboards — Apple, Google: show hours, don't connect them to focus.", MUTED),
    ("MindLoop — baseline vs yourself + buddy plan + story report. Honest, personal, complete.", INK),
], 2.9)

# 9 — Business model
s = bg_slide(TEAL)
title_box(s, "BUSINESS MODEL", 0.5, 28, TEAL)
title_box(s, "Freemium, bottom-up, expands with schools", 1.3, 32)
bullets(s, [
    ("Free — onboarding, baseline games, daily plan. Grow the habit first.", MUTED),
    ("Plus — advanced trends, family plans, wearable integrations.", MUTED),
    ("Institutions — schools and employers: anonymised cohorts, equity dashboards, PDPL-ready.", MUTED),
    ("Wedge: the story report kids love. Expansion: the attention record schools trust.", INK),
], 2.9)

# 10 — Traction
s = bg_slide(LEAF)
title_box(s, "TRACTION", 0.5, 28, LEAF)
title_box(s, "Live, measurable, aligned", 1.3, 32)
bullets(s, [
    ("LIVE — full journey in production: onboarding, 30 games, baseline index, story report.", INK),
    ("15 backend tests green — scoring, baselines, referrals, safety flags, story endpoint.", MUTED),
    ("Q1–Q10 aligned — instruments, frameworks, 30/90/180-day windows, FHIR, model card.", MUTED),
    ("North-star metric — % of users completing 4 baseline games, then 7-day plan adherence.", INK),
], 2.9)

# 11 — Team
s = bg_slide(PURPLE)
title_box(s, "TEAM", 0.5, 28, PURPLE)
title_box(s, "Builders who ship", 1.3, 32)
bullets(s, [
    ("Vinod Yallur — builds the full stack: detection, scoring engine, infra. Startups since 17.", MUTED),
    ("VINSANE INNOVATIONS 1A — the studio behind MindLoop, shipping product weekly.", MUTED),
], 2.9)

# 12 — Ask
s = bg_slide(CORAL)
title_box(s, "Join us", 1.2, 56, CORAL)
title_box(s, "Now — pilot with 2 schools, prove 30-day adherence. Next — wearable integrations, RCT.", 2.8, 22, INK)
body_box(s, "MindLoop · know your focus, from your own data · Vinod Yallur · VINSANE INNOVATIONS 1A", 4.6, 18, MUTED)

out = r"V:\iiui\VINSANE INNOVATIONS 1A\mindloop\video\MindLoop-Pitch-Deck.pptx"
prs.save(out)
print("saved", out, len(prs.slides.__iter__.__self__._sldIdLst), "slides")
