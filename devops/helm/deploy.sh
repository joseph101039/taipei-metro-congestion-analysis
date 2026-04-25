#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  echo "Usage: $0 [--dry-run] [server|web|all]"
  echo "  --dry-run   show diff only, do not apply"
  echo "  server      apply only the server release"
  echo "  web         apply only the web release"
  echo "  all         apply all releases (default)"
  exit 1
}

DRY_RUN=false
if [[ "${1}" == "--dry-run" ]]; then
  DRY_RUN=true
  shift
fi

TARGET="${1:-all}"
COMMAND=$( $DRY_RUN && echo "diff" || echo "apply" )

case "$TARGET" in
  server|web)
    helmfile -f "$SCRIPT_DIR/helmfile.yaml" -l name="$TARGET" $COMMAND
    ;;
  all)
    helmfile -f "$SCRIPT_DIR/helmfile.yaml" $COMMAND
    ;;
  *)
    usage
    ;;
esac
