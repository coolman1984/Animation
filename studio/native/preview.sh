#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname -- "$0")/../.."
root="$PWD"
engine="${1:-}"
entry="${2:-}"
: "${STUDIO_NATIVE_OUTPUT:?Set STUDIO_NATIVE_OUTPUT to an output directory}"
mkdir -p "$STUDIO_NATIVE_OUTPUT"
export STUDIO_NATIVE_OUTPUT="$(realpath -- "$STUDIO_NATIVE_OUTPUT")"

case "$engine" in
  blender) entry="${entry:-studio/native/blender-demo.py}" ;;
  godot) entry="${entry:-studio/native/godot-demo}" ;;
  *) echo 'Usage: bash studio/native/preview.sh blender|godot [entry]' >&2; exit 2 ;;
esac
entry="$(realpath -e -- "$entry")"
if [[ "$entry" != "$root/"* ]]; then
  echo 'Use an entry inside the checked-out repository.' >&2
  exit 2
fi

if [[ "$engine" == blender ]]; then
  [[ -f "$entry" && "$entry" == *.py ]]
  blender="${STUDIO_BLENDER_BIN:-$(bash studio/native/install.sh blender)}"
  "$blender" --background --factory-startup --disable-autoexec --python-exit-code 1 --python "$entry"
else
  [[ -f "$entry/project.godot" ]]
  godot="${STUDIO_GODOT_BIN:-$(bash studio/native/install.sh godot)}"
  "$godot" --headless --path "$entry" --editor --import
  export LIBGL_ALWAYS_SOFTWARE=1
  xvfb-run -a -s '-screen 0 1920x1080x24' "$godot" --path "$entry" \
    --rendering-method gl_compatibility --audio-driver Dummy --resolution 480x270 \
    --write-movie "$STUDIO_NATIVE_OUTPUT/godot-preview.avi" --fixed-fps 30 --quit-after 60
  ffmpeg -v error -nostdin -y -i "$STUDIO_NATIVE_OUTPUT/godot-preview.avi" \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$STUDIO_NATIVE_OUTPUT/godot-preview.mp4"
  rm -- "$STUDIO_NATIVE_OUTPUT/godot-preview.avi"
fi

find "$STUDIO_NATIVE_OUTPUT" -type f -size +0c -print -quit | grep -q .
