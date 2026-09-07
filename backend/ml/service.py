#!/usr/bin/env python3
"""
HoneyChain - Hive Health Internal Inference Service
Exposes local HTTP endpoint on 127.0.0.1:5001 for high-performance ML inference.
Loads all 26 model artifacts ONCE at startup into memory.
"""

import sys
import os
import json
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import logging

# Ensure model directory is in sys.path
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
if MODEL_DIR not in sys.path:
    sys.path.insert(0, MODEL_DIR)

try:
    from predict import get_model, predict as run_predict
except ImportError as e:
    logging.error(f"Failed to import predict module from {MODEL_DIR}: {e}")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [HoneyChain-ML] %(levelname)s: %(message)s'
)
logger = logging.getLogger("HoneyChain-ML")

# Global singleton model instance loaded once
_HIVE_MODEL = None

def init_model():
    global _HIVE_MODEL
    if _HIVE_MODEL is None:
        logger.info(f"Loading Hive Health Model artifacts from: {MODEL_DIR}")
        _HIVE_MODEL = get_model()
        logger.info(f"Model successfully loaded. Available tiers: {list(_HIVE_MODEL.tiers.keys())}")
    return _HIVE_MODEL

class MLRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence default noisy access logs, keep custom logging
        pass

    def _send_json(self, status_code, data):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        if self.path == '/health':
            model = init_model()
            self._send_json(200, {
                "status": "ok",
                "service": "honeychain-hive-health-ml",
                "version": "1.0.0",
                "modelLoaded": model is not None,
                "tiers": list(model.tiers.keys()) if model else []
            })
        else:
            self._send_json(404, {"error": "Not Found", "path": self.path})

    def do_POST(self):
        if self.path != '/predict':
            return self._send_json(404, {"error": "Not Found", "path": self.path})

        content_len = int(self.headers.get('Content-Length', 0))
        if content_len == 0:
            return self._send_json(400, {"status": "NO_DATA", "message": "Empty request body"})

        try:
            raw_body = self.rfile.read(content_len).decode('utf-8')
            payload = json.loads(raw_body)
        except Exception as e:
            return self._send_json(400, {"status": "NO_DATA", "message": f"Malformed JSON: {str(e)}"})

        hive_id = payload.get('hiveId', 'UNKNOWN')
        readings = payload.get('readings', [])

        if not isinstance(readings, list) or len(readings) == 0:
            return self._send_json(200, {
                "hiveId": hive_id,
                "status": "NO_DATA",
                "message": "No sensor readings provided for inference.",
                "tier": None,
                "healthScore": None,
                "stressRisk": None,
                "stressProbability": None,
                "abnormalityRisk": None
            })

        try:
            model = init_model()
            result = model.predict(readings=readings, hive_id=hive_id)
            return self._send_json(200, result)
        except Exception as err:
            logger.error(f"Inference error for hive {hive_id}: {err}", exc_info=True)
            return self._send_json(500, {
                "hiveId": hive_id,
                "status": "INFERENCE_ERROR",
                "message": "Model inference failed internally.",
                "tier": None,
                "healthScore": None,
                "stressRisk": None
            })

def run_server(host='127.0.0.1', port=5001):
    init_model()
    server = HTTPServer((host, port), MLRequestHandler)
    logger.info(f"Serving Hive Health Inference API at http://{host}:{port}/predict")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down inference server...")
        server.server_close()

def main():
    parser = argparse.ArgumentParser(description="HoneyChain Hive Health Inference Service")
    parser.add_argument('--host', default=os.environ.get('ML_HOST', '127.0.0.1'), help="Host binding (default: 127.0.0.1)")
    parser.add_argument('--port', type=int, default=int(os.environ.get('ML_PORT', '5001')), help="Port binding (default: 5001)")
    parser.add_argument('--predict-json', help="Run single prediction on JSON string and exit")
    parser.add_argument('--health-check', action='store_true', help="Check model loading and exit")

    args = parser.parse_args()

    if args.health_check:
        model = init_model()
        print(json.dumps({"status": "ok", "tiers": list(model.tiers.keys())}))
        sys.exit(0)

    if args.predict_json:
        init_model()
        data = json.loads(args.predict_json)
        res = run_predict(data.get('readings', []), hive_id=data.get('hiveId', 'UNKNOWN'))
        print(json.dumps(res, indent=2))
        sys.exit(0)

    run_server(host=args.host, port=args.port)

if __name__ == '__main__':
    main()
