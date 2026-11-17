"""Core on-device ML: lightweight trend forecaster trained on the user's own history.

Design (efficient by construction):
- No heavy deps (statistics only). Trains in milliseconds on SQLite rows.
- Per (task_key, metric_key): robust baseline (median/MAD) + exponentially
  weighted trend + next-session forecast band. Retrains on every new valid
  session — i.e. it "trains itself on historical data" incrementally.
- Descriptive only: outputs expected range + direction, never a diagnosis.
  Evidence note: consumer cognitive-training ML shows near-transfer only
  (Melby-Lervag 2016; Sala & Gobet 2017); this model forecasts *your own
  metric trajectory*, it does not predict ability or disorder.
"""
import statistics

ALPHA = 0.35  # EWMA weight for recent sessions


def train_series(values):
    """Fit on a list of historical metric values. Returns model dict."""
    if not values:
        return {"n": 0}
    centre = statistics.median(values)
    mad = statistics.median([abs(v - centre) for v in values]) if len(values) > 1 else 0.0
    ewma = values[0]
    for v in values[1:]:
        ewma = ALPHA * v + (1 - ALPHA) * ewma
    sigma = 1.4826 * mad
    slope = (values[-1] - values[0]) / max(len(values) - 1, 1)
    return {"n": len(values), "median": centre, "mad": mad, "sigma": sigma,
            "ewma": round(ewma, 3), "slope": round(slope, 4),
            "forecast": round(ewma + slope, 3),
            "band": [round(ewma + slope - 2 * sigma, 3), round(ewma + slope + 2 * sigma, 3)]}


def forecast_all(history):
    """history: {(task, metric): [values]} -> {key: model}."""
    return {k: train_series(v) for k, v in history.items() if v}
