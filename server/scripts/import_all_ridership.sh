#!/usr/bin/env bash
set -eu

DATA_DIR="$(cd "$(dirname "$0")/../doc/station_hourly_ridership/data" && pwd)"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/import_ridership.ts"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
find "$DATA_DIR" -name '*.csv' | sort -r > "$tmp"

total=$(wc -l < "$tmp" | tr -d ' ')
if [[ $total -eq 0 ]]; then
  echo "No CSV files found under $DATA_DIR"
  exit 0
fi

echo "Found $total CSV file(s)"
echo ""

count=0
while IFS= read -r file <&3; do
  count=$((count + 1))
  label="${file#"$DATA_DIR/"}"
  echo "[$count/$total] $label"
  npx ts-node "$SCRIPT" "$file"
  echo ""
done 3< "$tmp"

echo "All $total file(s) imported."