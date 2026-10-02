#!/usr/bin/env python3
"""Optional voiceover synthesis through Microsoft Edge's online neural voices (edge-tts).

Usage: python3 tools/tts_edge.py <voice> <rate e.g. -4%> <pitch e.g. +0Hz> <out.mp3> <text...>
Writes the audio plus <out>.words.json (word boundaries in seconds) for subtitle/cue timing.
TLS verification stays ON: if SSL_CERT_FILE is set (e.g. a corporate/agent proxy bundle) it is used
instead of certifi's bundle. Requires `pip install edge-tts` and network access; optional, never a
core studio dependency. Voice rights: check Microsoft's terms for the intended (commercial) use.
"""
import asyncio, json, os, ssl, sys
import edge_tts
from edge_tts import communicate as _c

if os.environ.get('SSL_CERT_FILE'):
    _c._SSL_CTX = ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])

async def main():
    voice, rate, pitch, out, *words = sys.argv[1:]
    text = ' '.join(words)
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary='WordBoundary')
    marks = []
    with open(out, 'wb') as f:
        async for chunk in com.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])
            elif chunk['type'] == 'WordBoundary':
                marks.append({'word': chunk['text'], 'start': chunk['offset'] / 1e7, 'end': (chunk['offset'] + chunk['duration']) / 1e7})
    with open(out + '.words.json', 'w', encoding='utf8') as f:
        json.dump(marks, f, ensure_ascii=False, indent=1)

asyncio.run(main())
