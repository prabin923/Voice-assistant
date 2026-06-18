#!/usr/bin/env bash
# College demo: open-source Whisper STT + free Edge TTS (no MiniMax / paid voice APIs)
# Whisper models: https://github.com/openai/whisper
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting open-source Whisper STT (Docker)"
docker compose -f docker-compose.whisper.yml up -d

append_env() {
  local key="$1"
  local value="$2"
  if [[ -f .env.local ]] && grep -q "^${key}=" .env.local; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" .env.local
    else
      sed -i "s|^${key}=.*|${key}=${value}|" .env.local
    fi
  else
    echo "${key}=${value}" >> .env.local
  fi
}

touch .env.local
append_env "VOICE_STACK" "free"
append_env "WHISPER_STT_ENDPOINT" "http://127.0.0.1:8000/v1"
append_env "WHISPER_STT_MODEL" "base"

if grep -q '^WHISPER_STT_ENDPOINT=https://api.openai.com' .env.local 2>/dev/null; then
  echo "==> Switched WHISPER_STT_ENDPOINT from paid OpenAI API to local Docker Whisper"
fi

echo ""
echo "==> Waiting for Whisper server on :8000"
for i in {1..30}; do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1 || curl -sf http://127.0.0.1:8000/v1/models >/dev/null 2>&1; then
    echo "Whisper server is up."
    break
  fi
  sleep 2
  if [[ "$i" -eq 30 ]]; then
    echo "Whisper container started but health check timed out. Check: docker compose -f docker-compose.whisper.yml logs"
  fi
done

echo ""
echo "College demo stack:"
echo "  STT: Open-source Whisper (Docker on :8000)"
echo "  TTS: Microsoft Edge TTS (free, no API key)"
echo "  Chat: GOOGLE_GENERATIVE_AI_API_KEY (Gemini free tier)"
echo ""
echo "Run: npm run demo:verify"
echo "Then: npm run dev → open http://localhost:3000/assistant"
