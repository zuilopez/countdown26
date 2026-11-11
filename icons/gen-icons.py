"""Radar icon generator for CTD (v0.73a). Run from the repo root:  python3 icons/gen-icons.py [#rrggbb]
Needs rsvg-convert (+ Pillow for sampling the outer-ring colour). Writes into icons/ :
  dark:  icon.svg · icon-192.png · icon-512.png · icon-maskable-512.png (square, content in safe zone) · apple-touch-icon.png (180)
  light: favicon-light.svg · icon-192-light.png · icon-512-light.png · icon-maskable-512-light.png · apple-touch-icon-light.png
Design (v0.73a): circle fills the whole icon (transparent corners), sweep arm at 12:00 with glow trailing 12 -> 6 on the right,
5 rings (outer + 4 inner, denser toward the centre), short ticks from each ring toward the centre (4 directions, length = 1/2 ring gap),
two faint diagonals, every line 6 px thick. Arg = scan-line colour (default red)."""
import math, os, re, subprocess, sys

OUT = os.path.dirname(os.path.abspath(__file__))
C = 256
START, SPAN, FAN_SPAN, N, R = -90.0, 300.0, 180.0, 60, 252
SC = R / 190
# theme colour for the scan line: python3 icons/gen-icons.py [#rrggbb]  (default = the app's red)
RED = sys.argv[1] if len(sys.argv) > 1 else '#e5322d'
_c = [int(RED[i:i + 2], 16) for i in (1, 3, 5)]
HOT = '#%02x%02x%02x' % tuple(round(v + (255 - v) * .22) for v in _c)
STROKE, INNER_W, K = 6, 6, 0.65

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


def build(mode, full_bleed=False, scale=1.0, outer=None):
    m = MODES[mode]
    tail = ''.join(f'<path d="{arc(R, START, START - SPAN * (k + 1) / N)}" fill="none" stroke="{HOT}" '
                   f'stroke-width="{STROKE}" stroke-opacity=".05"/>' for k in range(N))
    fan = '<g filter="url(#fb)">' + ''.join(
        f'<path d="{wedge(R - 5, START, START - FAN_SPAN * (k + 1) / 60)}" fill="{HOT}" fill-opacity=".022"/>'
        for k in range(60)) + '</g>'
    ex, ey = pt(R, START)
    bx, by = pt(R - 25, START)
    RADII = [R * (i / 5) ** 1.6 for i in (1, 2, 3, 4)]          # 4 inner rings + outer ring = 5, denser toward the centre
    OPS = [m['inner_o'][2] + (m['inner_o'][0] - m['inner_o'][2]) * i / 3 for i in range(4)]
    rings = ''.join(f'<circle cx="256" cy="256" r="{r:.2f}" fill="none" stroke="{m["inner"]}" '
                    f'stroke-width="{INNER_W}" stroke-opacity="{o:.3f}"/>' for r, o in zip(RADII, OPS))
    ticks = ''
    prev = 0
    for r, o in zip(RADII, OPS):
        L = (r - prev) / 2
        prev = r
        if L < INNER_W:
            continue
        for ang in (0, 90, 180, 270):
            x0, y0 = pt(r, ang); x1, y1 = pt(r - L, ang)
            ticks += f'<line x1="{x0:.2f}" y1="{y0:.2f}" x2="{x1:.2f}" y2="{y1:.2f}" stroke="{m["inner"]}" stroke-opacity="{o:.3f}" stroke-width="{INNER_W}"/>'
    if outer:
        Lo = (R - RADII[-1]) / 2
        for ang, col in zip((0, 90, 180, 270), outer):
            x0, y0 = pt(R, ang); x1, y1 = pt(R - Lo, ang)
            ticks += f'<line x1="{x0:.2f}" y1="{y0:.2f}" x2="{x1:.2f}" y2="{y1:.2f}" stroke="{col}" stroke-width="{STROKE}"/>'
    pre, post = '', ''
    if full_bleed:   # square icon for maskable / apple-touch: solid background, radar scaled into the safe zone
        pre = f'<rect width="512" height="512" fill="{m["base"]}"/><g transform="translate(256 256) scale({scale}) translate(-256 -256)">'
        post = '</g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<clipPath id="r"><circle cx="256" cy="256" r="256"/></clipPath>
<linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="256" y1="256" x2="{ex:.2f}" y2="{ey:.2f}"><stop offset="0" stop-color="{HOT}" stop-opacity=".12"/><stop offset=".55" stop-color="{HOT}" stop-opacity=".6"/><stop offset="1" stop-color="{HOT}" stop-opacity="1"/></linearGradient>
<filter id="b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="58"/></filter>
<filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="gw" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="11"/></filter>
<filter id="fb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="g2" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
{pre}<g transform="translate(512 0) scale(-1 1)">
<g clip-path="url(#r)">
<rect width="512" height="512" fill="{m['base']}"/>
<circle cx="{bx:.1f}" cy="{by:.1f}" r="165" fill="{RED}" fill-opacity="{m['blob_o']}" filter="url(#b)"/>
<rect width="512" height="512" fill="#fff" fill-opacity="{m['glass_o']}"/>
<rect width="512" height="512" filter="url(#n)" opacity="{m['noise']}"/>
</g>
<g stroke="{m['hori']}" stroke-opacity="{m['hori_o']/2:.3f}" stroke-width="{INNER_W}"><line x1="{256-R*.7071:.2f}" y1="{256-R*.7071:.2f}" x2="{256+R*.7071:.2f}" y2="{256+R*.7071:.2f}"/><line x1="{256+R*.7071:.2f}" y1="{256-R*.7071:.2f}" x2="{256-R*.7071:.2f}" y2="{256+R*.7071:.2f}"/></g>
<circle cx="256" cy="256" r="{R}" fill="none" stroke="{m['d_color']}" stroke-width="{STROKE}"/>
{rings}
{ticks}
{fan}
<g filter="url(#gw)" opacity=".6">{tail}</g>
<g filter="url(#g)" opacity=".85">{tail}</g>
{tail}
<line x1="256" y1="256" x2="{ex:.2f}" y2="{ey:.2f}" stroke="url(#lg)" stroke-width="24" opacity=".22" filter="url(#g2)"/>
<line x1="256" y1="256" x2="{ex:.2f}" y2="{ey:.2f}" stroke="url(#lg)" stroke-width="6"/>
</g>{post}
</svg>'''


def png(svg_path, size, out):
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), svg_path, '-o', out if os.path.isabs(out) else os.path.join(OUT, out)], check=True)


def write(name, text):
    p = os.path.join(OUT, name)
    open(p, 'w').write(text)
    return p


def outer_colours(mode):
    """Colour of the outer ring at 3h/6h/9h/12h (red tail over white), so the outer ticks look drawn into the ring."""
    try:
        from PIL import Image
    except ImportError:
        return None
    tmp_svg, tmp_png = os.path.join(OUT, '_s.tmp.svg'), os.path.join(OUT, '_s.tmp.png')
    open(tmp_svg, 'w').write(build(mode))
    png(tmp_svg, 512, tmp_png)
    im = Image.open(tmp_png).convert('RGB')
    cols = []
    for ang in (0, 90, 180, 270):
        x, y = pt(R, ang)
        cols.append('#%02x%02x%02x' % im.getpixel((int(round(512 - x)), int(round(y)))))   # group is mirrored: screen x = 512 - x
    os.remove(tmp_svg); os.remove(tmp_png)
    return cols


for mode, svgname, suffix in (('dark', 'icon.svg', ''), ('light', 'favicon-light.svg', '-light')):
    oc = outer_colours(mode)
    svg = write(svgname, build(mode, outer=oc))
    png(svg, 192, f'icon-192{suffix}.png')
    png(svg, 512, f'icon-512{suffix}.png')
    mk = write('_maskable.tmp.svg', build(mode, full_bleed=True, scale=0.8, outer=oc))      # Android maskable: content inside the 80% safe zone
    png(mk, 512, f'icon-maskable-512{suffix}.png')
    ap = write('_apple.tmp.svg', build(mode, full_bleed=True, scale=0.94, outer=oc))        # iOS rounds the corners itself
    png(ap, 180, f'apple-touch-icon{suffix}.png')
    os.remove(mk); os.remove(ap)
print('icons ok')
