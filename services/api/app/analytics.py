"""Transparent, non-diagnostic scoring + baseline + change detection.
The 0-100 Baseline Index is a *descriptive* rescaling of each user's own
metrics vs their own baseline band — never a population norm, never a
diagnosis (per build plan §3, §5). Research grounding: median/MAD robust
baselines (Leys et al. 2013), Reliable Change Index (Jacobson & Truax 1991);
training evidence shows near-transfer only (Melby-Lervag 2016; Sala & Gobet 2017)."""
import statistics

MIN_TRIALS = 10

# metric_key -> higher values mean better (for index direction)
HIGHER_BETTER = {"accuracy", "hit_rate", "max_span", "processing_speed_score",
                 "inhibition_score", "working_memory_score", "steadiness_score"}
LOWER_BETTER = {"omissions", "commissions", "false_alarm_rate", "median_rt_ms",
                "rt_variability_ms", "interference_ms", "sway_variability"}


def index_from_deviation(value, centre, mad):
    """Map a metric value to 0-100 vs own baseline band. 50 = at baseline median,
    ~100 = 2.5 robust-SD better, ~0 = 2.5 robust-SD worse. Returns None if no spread."""
    sigma = 1.4826 * (mad or 0.0)
    if sigma <= 1e-9:
        return 50.0 if value == centre else (100.0 if _better(value, centre) else 0.0)
    z = (value - centre) / sigma
    return round(max(0.0, min(100.0, 50.0 + z * 20.0)), 1)


def _better(value, centre):
    return True  # direction resolved per-metric by caller; equal-spread fallback only


def metric_index(metric_key, value, centre, mad):
    idx = index_from_deviation(value, centre, mad)
    if metric_key in LOWER_BETTER:
        idx = round(100.0 - idx, 1)
    return idx


def composite_index(indexed):
    """Mean of available 0-100 metric indexes. Descriptive only."""
    vals = [v for v in indexed.values() if isinstance(v, (int, float))]
    return round(sum(vals) / len(vals), 1) if vals else None

def score_trials(task_key, trials):
    """trials: list of dicts (non-practice). Returns (metrics dict, validity, reason)."""
    scored = [t for t in trials if not t.get("is_practice")]
    if len(scored) < MIN_TRIALS:
        return {}, "invalid", f"insufficient_trials:{len(scored)}<{MIN_TRIALS}"
    rts = [t["reaction_time_ms"] for t in scored if t.get("reaction_time_ms")]
    hits = sum(1 for t in scored if t["expected_action"] == "respond" and t.get("actual_action") == "respond")
    targets = sum(1 for t in scored if t["expected_action"] == "respond")
    nontargets = len(scored) - targets
    omissions = targets - hits
    commissions = sum(1 for t in scored if t["expected_action"] == "withhold" and t.get("actual_action") == "respond")
    m = {
        "accuracy": round(sum(1 for t in scored if t["correct"]) / len(scored), 3),
        "omissions": float(omissions), "commissions": float(commissions),
        "hit_rate": round(hits / targets, 3) if targets else 0.0,
        "false_alarm_rate": round(commissions / nontargets, 3) if nontargets else 0.0,
    }
    if rts:
        m["median_rt_ms"] = round(statistics.median(rts), 1)
        m["rt_variability_ms"] = round(statistics.pstdev(rts), 1) if len(rts) > 1 else 0.0
    if task_key == "memory":
        m["max_span"] = float(max((t.get("span") or 0) for t in scored))
    if task_key == "steadiness":
        sway = [t.get("sway") for t in scored if t.get("sway") is not None]
        if sway:
            m["sway_variability"] = round(statistics.pstdev(sway), 4) if len(sway) > 1 else 0.0
            m["steadiness_score"] = round(max(0.0, min(100.0, 100.0 - m["sway_variability"] * 400.0)), 1)
    return m, "valid", None

def confidence_label(n):
    return "established" if n >= 5 else "moderate" if n >= 3 else "building"

def build_baseline(values):
    """values: metric values from valid sessions -> (median centre, MAD variability)."""
    centre = statistics.median(values)
    mad = statistics.median([abs(v - centre) for v in values]) if len(values) > 1 else 0.0
    return round(centre, 3), round(mad, 3)

def detect_change(metric_key, latest, centre, variability, recent_values):
    """Conservative rule: needs >=2 recent points beyond 2.5 robust-SD same direction
    (Leys et al. 2013 band; Jacobson-Truax RCI spirit)."""
    band = max(2.5 * 1.4826 * variability, abs(centre) * 0.1, 1e-9)
    devs = [v - centre for v in recent_values[-2:]]
    if len(devs) < 2:
        return None
    if all(d > band for d in devs) or all(d < -band for d in devs):
        direction = "higher than your usual pattern" if devs[-1] > 0 else "lower than your usual pattern"
        return {
            "metric_key": metric_key, "direction": direction,
            "magnitude": round(abs(latest - centre), 3), "confidence_label": "possible",
            "user_message": (f"Your recent {metric_key} is {direction}. This is a possible change from your "
                             "personal baseline, not a diagnosis. Consider repeating the task on another day; "
                             "sleep, stress and environment can affect results."),
        }
    return None
