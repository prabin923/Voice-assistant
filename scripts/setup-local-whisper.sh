#!/usr/bin/env bash
# Install local Whisper STT (open-source, runs on your machine — no Gemini quota for speech-to-text)
set -euo pipefail

echo "==> Installing whisper-cpp and ffmpeg"
brew install whisper-cpp ffmpeg

MODEL_DIR="${HOME}/.local/share/whisper-cpp"
MODEL_FILE="ggml-base.en.bin"
mkdir -p "${MODEL_DIR}"

if [[ ! -f "${MODEL_DIR}/${MODEL_FILE}" ]]; then
  echo "==> Downloading Whisper base.en model (~150MB)"
  curl -L -o "${MODEL_DIR}/${MODEL_FILE}" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILE}"
fi

ENV_LINE="WHISPER_MODEL_PATH=${MODEL_DIR}/${MODEL_FILE}"
if [[ -f .env.local ]] && grep -q '^WHISPER_MODEL_PATH=' .env.local; then
  echo "WHISPER_MODEL_PATH already in .env.local"
else
  echo "" >> .env.local
  echo "# Self-hosted STT (local whisper-cpp — no Gemini quota for transcription)" >> .env.local
  echo "${ENV_LINE}" >> .env.local
  echo "Added ${ENV_LINE} to .env.local"
fi

echo ""
echo "Done. Restart npm run dev, use AI Mode on /assistant — STT uses your local Whisper model."
echo "Chat replies still use Gemini (GOOGLE_GENERATIVE_AI_API_KEY)."
