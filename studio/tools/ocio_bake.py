#!/usr/bin/env python3
"""Bake a .cube 3D LUT with OpenColorIO (node studio.mjs setup color). The LUT is applied by FFmpeg (config.lut in a film,
lib/color.mjs lutFilter / colorCheck). Uses OCIO's built-in studio config, so no config files are needed.

  python tools/ocio_bake.py list                                   colour spaces in the built-in config
  python tools/ocio_bake.py bake OUT.cube --src "ACEScg" --dst "sRGB - Texture" [--look NAME] [--size 33]

Typical uses: bring a linear ACEScg render (Blender/EXR) into the film's sRGB working space; bake a creative look.
A LUT is an approximation of the transform; check it with lib/color.mjs colorCheck({ lut }) and scopes before delivery."""
import sys, argparse
import sys as _sys; [s.reconfigure(encoding='utf-8') for s in (_sys.stdout, _sys.stderr)]  # Windows pipes default to cp1252
import PyOpenColorIO as ocio

CONFIG = 'ocio://studio-config-latest'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['list', 'bake'])
    ap.add_argument('out', nargs='?')
    ap.add_argument('--src', default='ACEScg')
    ap.add_argument('--dst', default='sRGB - Texture')
    ap.add_argument('--look', default='')
    ap.add_argument('--size', type=int, default=33)
    a = ap.parse_args()
    cfg = ocio.Config.CreateFromFile(CONFIG)
    if a.cmd == 'list':
        print(f'OCIO {ocio.__version__}; config {CONFIG}')
        for cs in cfg.getColorSpaces(): print(cs.getName())
        return
    if not a.out: sys.exit('bake needs OUT.cube')
    b = ocio.Baker()
    b.setConfig(cfg); b.setFormat('resolve_cube'); b.setInputSpace(a.src); b.setTargetSpace(a.dst); b.setCubeSize(a.size)
    if a.look: b.setLooks(a.look)
    with open(a.out, 'w', encoding='utf-8') as f: f.write(b.bake())
    print(f'baked {a.src} -> {a.dst}{" look " + a.look if a.look else ""} ({a.size}^3) to {a.out}')

if __name__ == '__main__':
    main()
