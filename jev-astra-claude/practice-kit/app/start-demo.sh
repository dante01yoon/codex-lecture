#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -z "${TYPESAFE_API_KEY:-}" ]; then
  read -r -s -p "TypeSafe API key (hidden input): " TYPESAFE_API_KEY
  echo
  export TYPESAFE_API_KEY
fi
exec node server.mjs
