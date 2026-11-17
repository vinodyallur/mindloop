# Fire-Boltt Ultimate 1.39 — Compatibility Test (UNVERIFIED)

Status: **not tested on physical device.** Current dashboard data is DEMO synthetic only.

## Confirm with product owner first
1. Companion app name on the phone (do NOT assume Da Fit).
2. Phone OS — Android (Health Connect possible) or iOS (different path).
3. Does the companion app write to Health Connect? Check Health Connect → Data and access for heart rate / sleep / steps / SpO₂ records from that app.

## Test checklist
- [ ] Pair watch, record one night's sleep + a walk; note sync delay.
- [ ] Verify each record type, unit, timestamp, source app in Health Connect.
- [ ] Only then build the Kotlin bridge: Health Connect read → `POST /api/v1/wearables/sync` (payload in build plan §11.1).
- [ ] Fallbacks: manual CSV/JSON import; DEMO adapter (current). No custom ROM, no protocol reverse-engineering.
- [ ] HRV / EDA / ECG / stress: do not implement unless the exact watch + export path proves them.
