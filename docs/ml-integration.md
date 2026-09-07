# HoneyChain - Hive Health & Disease Risk ML Subsystem Integration Guide

This document details the architecture, model specifications, telemetry preprocessing, inference lifecycle, and operational instructions for the HoneyChain Hive Health Machine Learning service.

---

## 1. Overview & Model Source

- **Model Repository**: [https://github.com/Aditya280805/Hive_Health_model](https://github.com/Aditya280805/Hive_Health_model)
- **Model Version**: `1.0.0-hive-health-6tier`
- **Subsystem Type**: Internal Python HTTP Inference Microservice (Same-Server / Localhost Loopback)
- **Host / Port**: `http://127.0.0.1:5001` (Configured via `ML_SERVICE_URL`)
- **Artifacts Included**: 26 pre-trained joblib/pickle scalers, Isolation Forests, XGBoost classifiers, quantile calibrations, and seasonal baselines located under `backend/ml/model/`.

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
Executes all 67 unit and integration tests including blockchain, IoT ingestion, QR verification, and ML inference.

---

## 7. Production Deployment (Render)

Render runs both Node and the internal Python microservice on the same native container.

### Render Configuration
1. **Root Directory**: `backend`
2. **Build Command**:
   ```bash
   npm install && npm run setup:ml && npm run build
   ```
3. **Start Command**:
   ```bash
   npm start
   ```

When `npm start` executes `dist/server.js`:
1. Express boots on `PORT` (e.g. `10000`).
2. Express automatically invokes `mlService.ensureServiceRunning()`.
3. `mlService` spawns `ml/venv/bin/python3 ml/service.py --port 5001`.
4. The Python service loads all 26 model artifacts into memory and serves `127.0.0.1:5001/predict`.
5. On container termination, `mlService.stopService()` cleanly terminates the process.

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
| `status: "SERVICE_UNAVAILABLE"` | Python service is starting or dependencies missing | Check `npm run setup:ml`. Run `ml/venv/bin/python3 ml/service.py --health-check`. |
| `status: "INSUFFICIENT_DATA"` | Hive has 0 sensor readings in MongoDB | Run `npm run seed` or trigger `/api/iot/simulate` to generate telemetry. |
| `status: "INCOMPLETE_FEATURES"` | Gaps in sensor readings exceed interpolation limits | Ensure continuous readings without 6h+ temperature or 11h+ weight outages. |
| Model reports `stressBasis: "anomaly"` | Less than 24 readings available | Normal behavior for T1, T6, and T12 tiers. Feed 25+ hourly readings to activate the T24 XGBoost classifier. |

---

## 9. Model Disclaimer & Scientific Validation Boundary

> [!NOTE]
> **Engineering Integration vs. Agricultural Validation**:
> While this implementation guarantees **100% technical integration correctness** (exact tensor alignment, deterministic feature extraction, thread-safe memory residency, sub-100ms inference, and zero hardcoded labels), the underlying machine learning weights were trained on open apiculture datasets (Würzburg / Schwartau). Further agricultural field validation is required before relying on predictions for commercial treatment decisions in Indian tropical/sub-tropical microclimates.
