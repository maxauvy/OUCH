#!/usr/bin/env python3
"""Builds the patient flyer (A5, 1 page) and brochure (A4, 2 pages) as PDFs:
2 languages (fr, en) x 2 palettes, from flyer.<lang>.html and plaquette.<lang>.html.

  python3 build.py            # build/ (HTML per palette) and pdf/ (the PDFs)
  python3 build.py --previews # also apercus/*.png (needs `npm i --no-save playwright` at the repo root)

Needs Google Chrome and a network connection (Google Fonts, Material Symbols).
The sources hold the copy and the layout; a palette is only four colours injected after the page's own <style>.
"""
import pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PALETTES = {
    'menthe-eucalyptus': dict(y='#8fdcd0', lav='#f6c9d8', ink='#12303a', paper='#f2faf9'),
    'bleu-ciel': dict(y='#a9d6f5', lav='#ffd9a0', ink='#12324a', paper='#f3f8fc'),
}
KINDS = {'flyer': 'flyer-A5', 'plaquette': 'plaquette-A4'}

(HERE / 'build').mkdir(exist_ok=True)
(HERE / 'pdf').mkdir(exist_ok=True)
built = []
for kind, label in KINDS.items():
    for lang in ('fr', 'en'):
        src = (HERE / f'{kind}.{lang}.html').read_text()
        for name, c in PALETTES.items():
            css = (f"<style>:root{{--y:{c['y']};--lav:{c['lav']};--ink:{c['ink']}}}"
                   f".sheet,.f{{background:{c['paper']}!important}}</style>")
            html = (src.replace('</head>', css + '</head>')
                       .replace('href="base.css"', 'href="../base.css"')
                       .replace('assets/', '../assets/'))
            out = HERE / 'build' / f'{name}-{kind}-{lang}.html'
            out.write_text(html)
            pdf = HERE / 'pdf' / f'OUCH-{label}-{lang}-{name}.pdf'
            subprocess.run([CHROME, '--headless=new', '--no-pdf-header-footer', '--allow-file-access-from-files',
                            '--virtual-time-budget=6000', f'--print-to-pdf={pdf}', str(out)],
                           check=True, stderr=subprocess.DEVNULL)
            built.append(out)
            print(pdf.name)

if '--previews' in sys.argv:
    subprocess.run(['node', str(HERE / 'apercu.mjs'), *map(str, built)], check=True)
