# NeuroGuard BLE Protocol Specification

> Shared protocol for Bangle.js 2 and ESP32-S3 firmware ↔ Web App communication.
> Both firmware variants MUST implement this exact service/characteristic layout so the frontend can connect to either device interchangeably.

---

## 1. BLE Advertising

| Field              | Value                                      |
| ------------------ | ------------------------------------------ |
| Device Name        | `NeuroGuard Watch`                         |
| Appearance         | Generic Watch (0x00C1)                     |
| TX Power           | 0 dBm                                      |
| Advertised Service | NeuroGuard Service UUID (see §2)           |
| Advertising Interval | 100 ms (connectable) / 1000 ms (idle)    |

---

## 2. GATT Service & Characteristic UUIDs

### Primary Services

| Service              | UUID                                   | Type   |
| -------------------- | -------------------------------------- | ------ |
| Heart Rate Service   | `0x180D`                               | SIG    |
| NeuroGuard Service   | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Custom |

### Heart Rate Service (`0x180D`)

| Characteristic       | UUID     | Properties | Format                          |
| -------------------- | -------- | ---------- | ------------------------------- |
| Heart Rate Measurement | `0x2A37` | Notify   | See §3.1                        |

### NeuroGuard Custom Service (`a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

| Characteristic    | UUID                                   | Properties | Format    |
| ----------------- | -------------------------------------- | ---------- | --------- |
| HRV RMSSD         | `a1b2c3d4-0001-7890-abcd-ef1234567890` | Notify     | See §3.2  |
| Accelerometer     | `a1b2c3d4-0002-7890-abcd-ef1234567890` | Notify     | See §3.3  |
| Stress Level      | `a1b2c3d4-0003-7890-abcd-ef1234567890` | Notify     | See §3.4  |
| Sleep State       | `a1b2c3d4-0004-7890-abcd-ef1234567890` | Notify     | See §3.5  |
| Skin Temperature  | `a1b2c3d4-0005-7890-abcd-ef1234567890` | Notify     | See §3.6  |
| SpO2              | `a1b2c3d4-0006-7890-abcd-ef1234567890` | Notify     | See §3.7  |
| GSR               | `a1b2c3d4-0007-7890-abcd-ef1234567890` | Notify     | See §3.8  |
| Batch Data        | `a1b2c3d4-00FF-7890-abcd-ef1234567890` | Indicate   | See §3.9  |
| Device Info       | `a1b2c3d4-00FE-7890-abcd-ef1234567890` | Read       | See §3.10 |

---

## 3. Characteristic Data Formats

All multi-byte integers are **little-endian**.

### 3.1 Heart Rate Measurement (`0x2A37`)

Standard Bluetooth SIG Heart Rate Measurement format:

| Byte | Field              | Type   | Description                               |
| ---- | ------------------ | ------ | ----------------------------------------- |
| 0    | Flags              | uint8  | `0x00` = HR is uint8, no other fields     |
| 1    | Heart Rate (BPM)   | uint8  | 0–255 BPM                                |

**Notification interval:** 1 second

### 3.2 HRV RMSSD (`a1b2c3d4-0001-...`)

| Byte | Field       | Type   | Description                          |
| ---- | ----------- | ------ | ------------------------------------ |
| 0–1  | RMSSD (ms)  | uint16 | Root Mean Square of Successive Differences, 0–65535 ms |

**Notification interval:** 5 seconds

### 3.3 Accelerometer (`a1b2c3d4-0002-...`)

| Byte | Field | Type  | Description                    |
| ---- | ----- | ----- | ------------------------------ |
| 0–1  | X     | int16 | X-axis, mg (milli-g), ±16000  |
| 2–3  | Y     | int16 | Y-axis, mg (milli-g), ±16000  |
| 4–5  | Z     | int16 | Z-axis, mg (milli-g), ±16000  |

**Notification interval:** 100 ms when streaming, disabled when idle

### 3.4 Stress Level (`a1b2c3d4-0003-...`)

| Byte | Field        | Type  | Description                            |
| ---- | ------------ | ----- | -------------------------------------- |
| 0    | Stress Index | uint8 | 0–100 (0 = relaxed, 100 = high stress) |

**Stress categories (based on RMSSD):**
- `0–25`: Relaxed (RMSSD > 50 ms)
- `26–50`: Normal (RMSSD 30–50 ms)
- `51–75`: Stressed (RMSSD 20–30 ms)
- `76–100`: High Stress (RMSSD < 20 ms)

**Notification interval:** 5 seconds

### 3.5 Sleep State (`a1b2c3d4-0004-...`)

| Byte | Field       | Type  | Description                                  |
| ---- | ----------- | ----- | -------------------------------------------- |
| 0    | Sleep State | uint8 | 0 = Awake, 1 = Light Sleep, 2 = Deep Sleep  |

**Notification interval:** 30 seconds

### 3.6 Skin Temperature (`a1b2c3d4-0005-...`)

| Byte | Field              | Type  | Description                     |
| ---- | ------------------ | ----- | ------------------------------- |
| 0–1  | Temperature × 100  | int16 | Degrees Celsius × 100 (e.g., 3650 = 36.50°C) |

**Notification interval:** 10 seconds

### 3.7 SpO2 (`a1b2c3d4-0006-...`)

| Byte | Field     | Type  | Description                     |
| ---- | --------- | ----- | ------------------------------- |
| 0    | SpO2 (%)  | uint8 | Blood oxygen saturation 0–100%  |

> **Note:** Only available on ESP32-S3 with MAX30102. Bangle.js sends 0.

**Notification interval:** 5 seconds

### 3.8 GSR (`a1b2c3d4-0007-...`)

| Byte | Field               | Type   | Description                                |
| ---- | ------------------- | ------ | ------------------------------------------ |
| 0–1  | Conductance × 100   | uint16 | Microsiemens × 100 (e.g., 250 = 2.50 µS)  |

> **Note:** Only available on ESP32-S3 with GSR module. Bangle.js sends 0.

**Notification interval:** 5 seconds

### 3.9 Batch Data (`a1b2c3d4-00FF-...`)

Used for reliable transfer of buffered readings via **indications** (acknowledged).

The payload is a **UTF-8 JSON string** (max 512 bytes per indication). For larger payloads, data is split across multiple indications with sequence numbering.

#### JSON Schema

```json
{
  "v": 1,
  "seq": 0,
  "ts": 1700000000,
  "device": "banglejs2",
  "readings": [
    {
      "t": 1700000000,
      "hr": 72,
      "hrv": 45,
      "stress": 32,
      "sleep": 0,
      "temp": 3650,
      "spo2": 98,
      "gsr": 250,
      "accel": [10, -20, 980],
      "steps": 1234
    }
  ]
}
```

| Field       | Type     | Description                                         |
| ----------- | -------- | --------------------------------------------------- |
| `v`         | int      | Protocol version (currently `1`)                    |
| `seq`       | int      | Sequence number for multi-packet (0-based)          |
| `ts`        | int      | Unix timestamp (seconds) of batch creation          |
| `device`    | string   | `"banglejs2"` or `"esp32s3"`                        |
| `readings`  | array    | Array of reading objects (max 10 per batch)          |
| `readings[].t`     | int  | Unix timestamp of reading                       |
| `readings[].hr`    | int  | Heart rate BPM                                  |
| `readings[].hrv`   | int  | RMSSD in ms                                     |
| `readings[].stress`| int  | Stress index 0–100                              |
| `readings[].sleep` | int  | Sleep state 0/1/2                               |
| `readings[].temp`  | int  | Temperature × 100                               |
| `readings[].spo2`  | int  | SpO2 % (0 if unavailable)                       |
| `readings[].gsr`   | int  | GSR µS × 100 (0 if unavailable)                 |
| `readings[].accel` | [int,int,int] | Accelerometer [x,y,z] in mg              |
| `readings[].steps` | int  | Cumulative step count for session               |

### 3.10 Device Info (`a1b2c3d4-00FE-...`)

Read-only JSON string identifying the device:

```json
{
  "fw": "1.0.0",
  "device": "banglejs2",
  "sensors": ["hr", "hrv", "accel", "temp"],
  "battery": 85
}
```

| Field     | Type     | Description                                              |
| --------- | -------- | -------------------------------------------------------- |
| `fw`      | string   | Firmware version                                         |
| `device`  | string   | `"banglejs2"` or `"esp32s3"`                             |
| `sensors` | string[] | Available sensor capabilities                            |
| `battery` | int      | Battery percentage 0–100                                  |

---

## 4. Connection State Machine

```
ADVERTISING ──[connect]──> CONNECTED ──[disconnect]──> ADVERTISING
     │                         │
     │                    [subscribe]
     │                         │
     │                    STREAMING
     │                    (high rate)
     │                         │
     │                   [unsubscribe/
     │                    disconnect]
     │                         │
     └─────────────────────────┘
```

### Sampling Rates by State

| Sensor        | Disconnected (Idle) | Connected (Active) |
| ------------- | ------------------- | ------------------ |
| Heart Rate    | 10 s                | 1 s                |
| HRV           | off                 | 5 s                |
| Accelerometer | off                 | 100 ms             |
| Stress        | off                 | 5 s                |
| Sleep         | 30 s                | 30 s               |
| Temperature   | 60 s                | 10 s               |
| SpO2          | off                 | 5 s                |
| GSR           | off                 | 5 s                |

### Power Management

- **Bangle.js 2:** Reduce `Bangle.setOptions()` sensor polling. Use `Bangle.setLCDPower(0)` when idle.
- **ESP32-S3:** Enter light sleep between reads when disconnected. Use `esp_sleep_enable_timer_wakeup()` + `esp_sleep_enable_bt_wakeup()`.

---

## 5. Error Handling

- If a sensor read fails, send the **last known good value** with the MSB of the first byte set to 1 as a staleness flag (only for custom characteristics; standard HR follows SIG spec).
- Batch data includes only successfully-read fields; omitted fields mean the sensor is unavailable.

---

## 6. Versioning

- Protocol version is in the batch data `"v"` field and the device info `"fw"` field.
- Breaking changes increment the major version. The web app checks `"v"` and shows a warning if mismatched.
