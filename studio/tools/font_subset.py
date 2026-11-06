"""Subset one font to the characters a site really uses and save it as WOFF2 (fontTools, MIT; `node studio.mjs setup webperf`).

  python tools/font_subset.py <font.ttf|woff2> <chars.txt> <out.woff2> [--name="Studio Text A1B2"]

Arabic needs its joining forms and ligatures: every OpenType layout feature is kept ('*'), and fontTools' GSUB closure pulls
in the initial/medial/final glyphs reachable from the kept characters. A subset is a *Modified Version* under the SIL OFL:
when the licence declares a Reserved Font Name (IBM Plex declares "Plex"), the modified file must not carry that name, so
the family names (name IDs 1, 2, 4, 6, 16, 17) are replaced with --name and the copyright (0), licence (13, 14) and
trademark (7) records are kept unchanged. Prints a JSON line: {"in": bytes, "out": bytes, "glyphs": n}.
"""
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) for a in argv if a.startswith('--') and '=' in a)
    if len(args) != 3:
        print(__doc__)
        return 2
    src, chars_file, out = args
    with open(chars_file, encoding='utf-8') as f:
        text = f.read()
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 16, 17]
    options.flavor = 'woff2'
    options.notdef_outline = True
    options.recalc_bounds = True
    font = TTFont(src)
    sub = subset.Subsetter(options)
    sub.populate(text=text)
    sub.subset(font)
    new = opts.get('name')
    if new:
        name = font['name']
        for rec in list(name.names):
            if rec.nameID in (1, 4, 16):
                name.setName(new, rec.nameID, rec.platformID, rec.platEncID, rec.langID)
            elif rec.nameID == 6:
                name.setName(new.replace(' ', ''), 6, rec.platformID, rec.platEncID, rec.langID)
            elif rec.nameID == 3:
                name.setName(new + ' subset', 3, rec.platformID, rec.platEncID, rec.langID)
            elif rec.nameID == 17:
                name.removeNames(nameID=17)
    font.flavor = 'woff2'
    font.save(out)
    print(json.dumps({'in': os.path.getsize(src), 'out': os.path.getsize(out), 'glyphs': len(font.getGlyphOrder())}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
