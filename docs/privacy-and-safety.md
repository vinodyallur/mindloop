# Privacy & Safety

- Neutral language only: "attention performance", "change from personal baseline". Never "brain rot", "dopamine detox", diagnosis, or cure claims.
- Tasks are experimental product assessments, not clinically validated instruments; no clinical cut-offs or percentiles.
- Separate consent per category (`assessment`, `wearable`, `digital_use`), revocable in Settings; audit-logged.
- Export (`POST /api/v1/me/export`) and delete (`DELETE /api/v1/me`) provided. Minimise data; no health data in URLs/logs; no third-party AI APIs.
- Wearable HR/SpO₂/sleep/steps are context only. Stress is self-report only — never inferred from heart rate.
- Initial audience: adults/students. No minors without guardian consent, safeguarding and clinical/privacy review.
- Production requires: real auth (replace demo API key), HTTPS, encrypted-at-rest DB, privacy/legal + clinical review for the target jurisdiction.
