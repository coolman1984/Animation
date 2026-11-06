#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)/$(uname -m)" != Linux/x86_64 ]]; then
  echo 'This portable setup targets Linux x86-64.' >&2
  exit 2
fi

case "${1:-}" in
  blender)
    file=blender-4.5.15-linux-x64.tar.xz
    url="https://download.blender.org/release/Blender4.5/$file"
    hash=0d2b8bb2efe97e6c8eb57de6b7322f8800e1984e3125b60decca5f6771e4773e
    binary=blender
    ;;
  godot)
    file=Godot_v4.5.1-stable_linux.x86_64.zip
    url="https://github.com/godotengine/godot-builds/releases/download/4.5.1-stable/$file"
    hash=02ec53d1cc7dbb9cc6355393c61b9ab43d1244751a124f10248a4802830788cd
    binary=Godot_v4.5.1-stable_linux.x86_64
    ;;
  *) echo 'Usage: bash studio/native/install.sh blender|godot' >&2; exit 2 ;;
esac

cache="${STUDIO_ENGINE_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/animation-engines}"
mkdir -p "$cache"
cache="$(cd "$cache" && pwd)"
directory="$cache/$hash"
if [[ ! -x "$directory/$binary" ]]; then
  stage="$(mktemp -d "$cache/.stage.XXXXXXXX")"
  trap 'rm -rf -- "$stage"' EXIT
  curl --fail --location --retry 2 --connect-timeout 20 --max-time 300 --silent --show-error "$url" -o "$stage/$file"
  printf '%s  %s\n' "$hash" "$stage/$file" | sha256sum --check --status
  mkdir "$stage/engine"
  if [[ "$1" == blender ]]; then
    tar -xJf "$stage/$file" -C "$stage/engine" --strip-components=1
  else
    unzip -q "$stage/$file" -d "$stage/engine"
    chmod +x "$stage/engine/$binary"
  fi
  mv -T -- "$stage/engine" "$directory" || test -x "$directory/$binary"
fi
printf '%s\n' "$directory/$binary"
