#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "[HoneyChain-ML] Preparing Python ML environment in: $DIR/venv"

if [ ! -d "$DIR/venv" ]; then
  echo "[HoneyChain-ML] Creating Python virtual environment..."
  python3 -m venv "$DIR/venv"
fi

echo "[HoneyChain-ML] Installing dependencies from $DIR/model/requirements.txt..."
"$DIR/venv/bin/pip" install --upgrade pip --quiet
"$DIR/venv/bin/pip" install -r "$DIR/model/requirements.txt" --quiet

echo "[HoneyChain-ML] Verifying model dependencies..."
"$DIR/venv/bin/python3" -c "import joblib, sklearn, xgboost, pandas, numpy; print('✓ All ML packages verified successfully!')"
