# HoneyChain - Hive Health & Disease Risk ML Subsystem Integration Guide

This document details the architecture, model specifications, telemetry preprocessing, inference lifecycle, and operational instructions for the HoneyChain Hive Health Machine Learning service.

---

## 1. Overview & Model Source

- **Model Repository**: [https://github.com/Aditya280805/Hive_Health_model](https://github.com/Aditya280805/Hive_Health_model)
- **Standalone Microservice Repository**: `HoneyChain_ML` (Standalone Python Microservice)
- **Model Version**: `1.0.0-hive-health-6tier`
- **Subsystem Type**: Independent Python HTTP Inference Microservice (Server-to-Server HTTPS)
- **Host / Port**: `0.0.0.0:${PORT:-5001}` (Configured via `ML_SERVICE_URL` and optional `ML_API_KEY`)
- **Artifacts Included**: 26 pre-trained joblib/pickle scalers, Isolation Forests, XGBoost classifiers, quantile calibrations, and seasonal baselines located under `HoneyChain_ML/models/`.

> [!IMPORTANT]
> **Model Integrity Policy**: All 26 model artifacts, feature configurations, and calibration files are external assets owned by the ML team. They are treated as immutable artifacts and loaded without retraining or modification.

---

## 2. Six-Tier Inference Hierarchy

The model selects the highest eligible tier based on the continuous chronological history available for a hive:

| Tier | Window Span | Min Readings | Detection Scope | Classifier Active? |
|---|---|---|---|---|
| **`T1`** | 1 hour | 1 reading | Colony activity anomaly vs seasonal baseline | ❌ No (stressRisk from Anomaly %; `stressProbability = null`) |
| **`T6`** | 6 hours | 7 readings | Fast weight drop (robbing or swarming detection) | ❌ No (stressRisk from Anomaly %; PR-AUC ~0.21 fallback) |
| **`T12`** | 12 hours | 13 readings | Weight trend dynamics and medium-term variance | ❌ No (stressRisk from Anomaly %; PR-AUC ~0.30 fallback) |
| **`T24`** | 24 hours | 25 readings | Full circadian cycle + diurnal foraging rhythms | ✅ Yes (Trained XGBoost classifier active) |
| **`T36`** | 36 hours | 37 readings | Sustained weight decline across multi-day shifts | ✅ Yes (Trained XGBoost classifier active) |
| **`T48`** | 48 hours | 49 readings | Long-term starvation and colony depletion patterns | ✅ Yes (Trained XGBoost classifier active) |

---

## 3. Data Transformation & Feature Preparation

### 3.1 Input Contract (per Reading)
The internal inference service expects JSON:
```json
{
  "hiveId": "HIVE-KV-201",
  "readings": [
    {
      "timestamp": "2026-05-10 12:00:00",
      "temperature": 24.5,
      "humidity": 62.0,
      "weight": 35.8,
      "flow": 45
    }
  ]
}
```

### 3.2 Transformation Rules from `SensorReading`
1. **Timestamp / Timezone Handling**:
   - MongoDB stores UTC ISO dates (`2026-05-10T06:30:00.000Z`).
   - The ML model requires **local time at the hive** (`YYYY-MM-DD HH:mm:ss`) to correctly calculate daylight features (`is_daylight: hr >= 7 && hr <= 19`), harmonic cycles (`hour_sin`, `hour_cos`), and index matching against `seasonal_baseline.csv`.
   - Default conversion uses Indian Standard Time (IST, UTC+05:30 / +330 minutes offset) for Indian hives.
2. **Temperature & Humidity**:
   - `temperature`: Maps from `ambientTemperature` (ambient air). If omitted or null, it safely falls back to in-hive `temperature`.
   - `humidity`: Maps from `ambientHumidity`. If omitted or null, it falls back to in-hive `humidity`.
3. **Weight**:
   - Directly maps from `weightKg`.
4. **Bee Activity Flow**:
   - Signed integer (`flow = entering - leaving`).
   - Sourced from `flow`, `beeInCount - beeOutCount`, or `metadata.flow`.
   - **Crucial Rule**: Bee flow is **hourly summed**, never averaged.

---

## 4. Output Contract & Schema Persistence

When inference executes, the model returns:

```json
{
  "hiveId": "HIVE-KV-201",
  "timestamp": "2026-05-10T12:00:00",
  "status": "OK",
  "tier": "T24",
  "hoursAvailable": 25,
  "hoursObserved": 25,
  "healthScore": 88.4,
  "stressRisk": "LOW",
  "stressProbability": 0.082,
  "abnormalityRisk": 22.1,
  "detectionScope": [
    "colony activity anomaly",
    "fast weight drop (robbing / swarm)",
    "sustained weight decline (starvation)"
  ],
  "drivers": {
    "activityDeviation": -0.42,
    "temperatureDeviation": 0.15,
    "netFlow": 65,
    "weightTrend": 0.08,
    "weightDrop": -0.02
  },
  "recommendation": "Colony within normal range. No action needed.",
  "stressBasis": "classifier"
}
```

### 4.1 Persistence in `AIPrediction` Collection
The result is persisted into MongoDB `AIPrediction`:
- `predictionId`: `PRED-ML-${hiveId}-${timestamp}`
- `targetType`: `"hive"`
- `predictionType`: `"colony_health"`
- `modelVersion`: `"1.0.0-hive-health-6tier"`
- `result`: Stores `tier`, `healthScore`, `stressRisk`, `stressProbability`, `abnormalityRisk`, `stressBasis`, `detectionScope`, `drivers`, `recommendation`, and `caveat`.
- Concurrently updates `Hive.currentHealthSummary` with `healthScore`, `status` (`healthy` | `warning` | `critical`), `stressIndex`, and `lastAIPredictionId`.

---

## 5. API Endpoints Reference

### 5.1 Trigger Live Prediction
- **`POST /api/ml/predict/:hiveId`**
- **Query params**: `?persist=true` (default: true)
- **Response**: `200 OK`
```json
{
  "success": true,
  "status": "OK",
  "data": {
    "prediction": { ... },
    "modelOutput": { ... }
  }
}
```
If telemetry is missing (< 1 reading):
```json
{
  "success": false,
  "status": "INSUFFICIENT_DATA",
  "message": "No sensor telemetry available for hive 'HIVE-SB-101'. At least 1 reading is required for T1 analysis.",
  "data": null
}
```

### 5.2 Get Prediction History
- **`GET /api/ml/predictions/:hiveId?limit=20&page=1`**
- **Response**: `200 OK` with paginated array of historical `AIPrediction` records.

### 5.3 Get Latest Prediction
- **`GET /api/ml/latest/:hiveId`**
- **Response**: `200 OK` with most recent prediction, or `404 Not Found`.

### 5.4 Internal Microservice Health Probe
- **`GET /api/ml/health`**
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "modelLoaded": true,
    "tiers": ["T1", "T6", "T12", "T24", "T36", "T48"],
    "serviceUrl": "http://127.0.0.1:5001"
  }
}
```

---

## 6. Local Setup & Development Workflow

### Prerequisites
- Node.js 20+ & npm
- Python 3.10+ (Standard on Linux / macOS)

### Step 1: Install Python Dependencies
```bash
cd backend
npm run setup:ml
```
This initializes a dedicated virtual environment in `backend/ml/venv` and installs `scikit-learn==1.6.1`, `xgboost==3.2.0`, `pandas==2.3.3`, `numpy==2.0.2`, and `joblib==1.5.3`.

### Step 2: Seed Realistic 48-Hour Data
```bash
npm run seed
```

### Step 3: Start Development Server
```bash
npm run dev
```
The Node.js backend automatically detects and boots the Python inference microservice on port 5001 in the background!

### Step 4: Run Automated Tests
```bash
npm test
```
Executes all 90 unit and integration tests across Auth, Blockchain, IoT ingestion, QR verification, and ML client resilience.

---

## 7. Decoupled Production Deployment (e.g. Render)

The ML service is deployed as an **independent Web Service** in its own repository (`HoneyChain_ML`), separate from the Express backend (`HoneyChain_Backend`).

### Architecture
```text
Express Backend (Node.js/TS) ───[ HTTPS + X-ML-API-Key ]───> Deployed ML Microservice (Python)
```

### A. Deploying the ML Microservice (`HoneyChain_ML`)
1. Create a new Web Service on Render from the `HoneyChain_ML` GitHub repository.
2. **Environment**: Python 3
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `python service.py`
5. **Health Check Path**: `/health`
6. **Environment Variables**:
   - `ML_API_KEY`: *(Secure secret key)*
   - `PORT`: *(Render automatically injects PORT)*

### B. Configuring the Express Backend (`HoneyChain_Backend`)
In your Express deployment:
1. Set `ML_SERVICE_URL` to your deployed ML service URL (e.g. `https://honeychain-ml.onrender.com`).
2. Set `ML_API_KEY` to match the key configured on the ML service.
3. Express builds with standard `npm run build` (`tsc && tsc-alias`) with **zero Python runtime prerequisites**.

---

## 8. Verification & Troubleshooting

### How to Manually Trigger a Test Prediction
Via cURL:
```bash
curl -X POST http://localhost:5000/api/ml/predict/HIVE-KV-201
```

### How to Verify Stored Predictions in MongoDB
In `mongosh`:
```javascript
use honeychain;
db.aipredictions.find({ hiveId: "HIVE-KV-201" }).sort({ predictionTimestamp: -1 }).pretty();
```

### Troubleshooting Checklist
| Symptom | Cause | Solution |
|---|---|---|
| `status: "SERVICE_UNAVAILABLE"` | ML microservice is unreachable or starting up | Verify `ML_SERVICE_URL` in `.env`. Check ML service `/health` probe. |
| `status: "UNAUTHORIZED"` | Missing or mismatched `X-ML-API-Key` | Ensure `ML_API_KEY` in Express matches `ML_API_KEY` in `HoneyChain_ML`. |
| `status: "SERVICE_TIMEOUT"` | ML microservice took longer than `ML_TIMEOUT_MS` | Check network latency or increase `ML_TIMEOUT_MS` (default: 10000ms). |
| `status: "INSUFFICIENT_DATA"` | Hive has 0 sensor readings in MongoDB | Run `npm run seed` or trigger `/api/iot/simulate` to generate telemetry. |
| `status: "INCOMPLETE_FEATURES"` | Gaps in sensor readings exceed interpolation limits | Ensure continuous readings without 6h+ temperature or 11h+ weight outages. |
| Model reports `stressBasis: "anomaly"` | Less than 24 readings available | Normal behavior for T1, T6, and T12 tiers. Feed 25+ hourly readings to activate the T24 XGBoost classifier. |

---

## 9. Model Disclaimer & Scientific Validation Boundary

> [!NOTE]
> **Engineering Integration vs. Agricultural Validation**:
> While this implementation guarantees **100% technical integration correctness** (exact tensor alignment, deterministic feature extraction, thread-safe memory residency, sub-100ms inference, and zero hardcoded labels), the underlying machine learning weights were trained on open apiculture datasets (Würzburg / Schwartau). Further agricultural field validation is required before relying on predictions for commercial treatment decisions in Indian tropical/sub-tropical microclimates.

---

## 10. Hybrid Gemini AI Decision Support Layer

### 10.1 Architecture & Pipeline Flow
```text
Sensors (IoT) ───> 48h Rolling Window ───> ML Prediction (Hourly) ───> Trigger Evaluation ───> Gemini Reasoning ───> MongoDB
                                                                              │
                                                                   (Healthy / Cooldown)
                                                                              ▼
                                                                       Saved to DB (Skip LLM)
```

1. **Hourly Evaluation**: Active hives are evaluated every hour over a 48-hour rolling telemetry window (`hiveHealthScheduler.service.ts`).
2. **Selective Trigger Layer (`predictionTrigger.service.ts`)**:
   - Evaluates whether expensive LLM calls are warranted:
     - **Critical Health**: Score $\le 40$ or status `critical`.
     - **State Transition**: `normal` $\rightarrow$ `warning`/`critical`, `warning` $\rightarrow$ `critical`.
     - **Health Drop**: Drop $\ge 10$ points in 1 hour, or $\ge 15$ points across 24 hours.
     - **Persistent Abnormal**: 3 or more consecutive non-healthy predictions.
     - **Sensor Anomalies**: Brood hypothermia ($<31.5^\circ\text{C}$), hyperthermia ($>38.0^\circ\text{C}$), rapid weight drop ($<-1.5\text{kg}$), or internal humidity ($>85\%$).
   - **Cooldown**: 6-hour suppression window (`GEMINI_COOLDOWN_HOURS=6`), automatically bypassed by critical health escalations.
3. **Structured Gemini Inference (`gemini.service.ts`)**:
   - Model: `gemini-1.5-flash` with `responseMimeType: "application/json"`.
   - Multi-source Context: ML health score/tier/drivers, 24h prediction timeline, 48h sensor aggregates (min/max/avg/latest/trend), and live Open-Meteo local weather.
   - Non-diagnostic Guarantee: Framed as apiculture advisory and veterinary decision support without claiming definitive pathogen diagnosis.
   - Fault Tolerance: Built-in heuristic apiculture reasoner fallback ensures ML predictions are never dropped if the Gemini API is unreachable or rate-limited.
4. **Data Persistence**:
   - Every hourly ML prediction is saved in `AIPrediction` with its full input window and results.
   - If triggered, `AIPrediction.gemini` stores the reasoning result.
   - `Hive.currentHealthSummary` updates with `healthScore`, `status`, `stressIndex`, and `latestGeminiAnalysis`.
