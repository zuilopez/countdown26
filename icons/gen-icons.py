"""Radar icon generator for CTD (v0.31a). Run from the repo root:  python3 icons/gen-icons.py
Needs rsvg-convert. Writes into icons/ :
  dark:  icon.svg · icon-192.png · icon-512.png · icon-maskable-512.png (full-bleed) · apple-touch-icon.png (180)
  light: favicon-light.svg · icon-192-light.png · icon-512-light.png · icon-maskable-512-light.png · apple-touch-icon-light.png
Design: radar, 1:30 sweep arm, red C tail 1:30 -> 3:30, vertical axis + outer ring = letter D."""
import math, os, re, subprocess, sys

OUT = os.path.dirname(os.path.abspath(__file__))
C = 256
START, SPAN, FAN_SPAN, N, R = -45.0, 300.0, 100.0, 60, 232   # v0.68: circle enlarged (190 -> 232), no rounded square
SC = R / 190
# theme colour for the scan line: python3 icons/gen-icons.py [#rrggbb]  (default = the app's red)
RED = sys.argv[1] if len(sys.argv) > 1 else '#e5322d'
_c = [int(RED[i:i + 2], 16) for i in (1, 3, 5)]
HOT = '#%02x%02x%02x' % tuple(round(v + (255 - v) * .22) for v in _c)
STROKE, INNER_W, HORI_W, K = 4.2, 3, 2.4, 0.65

MODES = {
    'dark': dict(base='#000000', blob_o=.34, glass_o=0, noise=.03, edge=.12,
                 d_color='#f2f2f5', inner='#9a9ca6', inner_o=[.46 * K, .30 * K, .17 * K],
                 hori='#9a9ca6', hori_o=.46 * K),
    'light': dict(base='#ffffff', blob_o=.22, glass_o=0, noise=.02, edge=.16,
                  d_color='#2a2b30', inner='#2a2b30', inner_o=[.40 * K, .27 * K, .15 * K],
                  hori='#2a2b30', hori_o=.40 * K),
}


def pt(r, a):
    return (C + r * math.cos(math.radians(a)), C + r * math.sin(math.radians(a)))


def arc(r, a0, a1):
    x0, y0 = pt(r, a0)
    x1, y1 = pt(r, a1)
    return f'M{x0:.2f} {y0:.2f}A{r} {r} 0 {1 if (a0 - a1) > 180 else 0} 0 {x1:.2f} {y1:.2f}'


def wedge(r, a0, a1):
    x0, y0 = pt(r, a0)
    x1, y1 = pt(r, a1)
    return f'M{C} {C}L{x0:.2f} {y0:.2f}A{r} {r} 0 {1 if (a0 - a1) > 180 else 0} 0 {x1:.2f} {y1:.2f}Z'


def build(mode, full_bleed=False):
    m = MODES[mode]
    tail = ''.join(f'<path d="{arc(R, START, START - SPAN * (k + 1) / N)}" fill="none" stroke="{HOT}" '
                   f'stroke-width="{STROKE}" stroke-opacity=".05"/>' for k in range(N))
    fan = '<g filter="url(#fb)">' + ''.join(
        f'<path d="{wedge(R - 5, START, START - FAN_SPAN * (k + 1) / 24)}" fill="{HOT}" fill-opacity=".03"/>'
        for k in range(24)) + '</g>'
    ex, ey = pt(R, START)
    bx, by = pt(R - 25, START)
    rings = ''.join(f'<circle cx="256" cy="256" r="{r}" fill="none" stroke="{m["inner"]}" '
                    f'stroke-width="{INNER_W}" stroke-opacity="{o:.3f}"/>'
                    for r, o in zip((142 * SC, 95 * SC, 48 * SC), m['inner_o']))
    a0, a1 = 256 - R, 256 + R
    rx = 0
    border = ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<clipPath id="r"><rect width="512" height="512" rx="{rx}"/></clipPath>
<linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="256" y1="256" x2="{ex:.2f}" y2="{ey:.2f}"><stop offset="0" stop-color="{HOT}" stop-opacity=".12"/><stop offset=".55" stop-color="{HOT}" stop-opacity=".6"/><stop offset="1" stop-color="{HOT}" stop-opacity="1"/></linearGradient>
<filter id="b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="58"/></filter>
<filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="gw" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="11"/></filter>
<filter id="fb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="g2" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<g clip-path="url(#r)">
<rect width="512" height="512" fill="{m['base']}"/>
<circle cx="{bx:.1f}" cy="{by:.1f}" r="165" fill="{RED}" fill-opacity="{m['blob_o']}" filter="url(#b)"/>
<rect width="512" height="512" fill="#fff" fill-opacity="{m['glass_o']}"/>
<rect width="512" height="512" filter="url(#n)" opacity="{m['noise']}"/>
</g>
{border}
<line x1="{a0}" y1="256" x2="{a1}" y2="256" stroke="{m['hori']}" stroke-opacity="{m['hori_o']:.3f}" stroke-width="{HORI_W}"/>
<line x1="256" y1="{a0}" x2="256" y2="{a1}" stroke="{m['d_color']}" stroke-width="{STROKE}"/>
<circle cx="256" cy="256" r="{R}" fill="none" stroke="{m['d_color']}" stroke-width="{STROKE}"/>
{rings}
{fan}
<g filter="url(#gw)" opacity=".6">{tail}</g>
<g filter="url(#g)" opacity=".85">{tail}</g>
{tail}
<line x1="256" y1="256" x2="{ex:.2f}" y2="{ey:.2f}" stroke="url(#lg)" stroke-width="16" opacity=".22" filter="url(#g2)"/>
<line x1="256" y1="256" x2="{ex:.2f}" y2="{ey:.2f}" stroke="url(#lg)" stroke-width="3"/>
</svg>'''


def png(svg_path, size, out):
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), svg_path, '-o', os.path.join(OUT, out)], check=True)


def write(name, text):
    p = os.path.join(OUT, name)
    open(p, 'w').write(text)
    return p


dark = write('icon.svg', build('dark'))
light = write('favicon-light.svg', build('light'))
png(dark, 192, 'icon-192.png')
png(dark, 512, 'icon-512.png')
png(light, 192, 'icon-192-light.png')
png(light, 512, 'icon-512-light.png')
for mode, suffix in (('dark', ''), ('light', '-light')):
    full = write('_full-bleed.tmp.svg', build(mode, full_bleed=True))
    png(full, 512, f'icon-maskable-512{suffix}.png')
    png(full, 180, f'apple-touch-icon{suffix}.png')
    os.remove(full)
print('icons ok')
