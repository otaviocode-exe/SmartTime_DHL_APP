import cairosvg
from PIL import Image
from io import BytesIO
from pathlib import Path

PUB = Path("/app/frontend/public")

ART = '''
  <circle cx="226" cy="236" r="150" stroke="#D40511" stroke-width="34" fill="none"/>
  <g fill="#D40511">
    <rect x="219" y="107" width="14" height="34" rx="7"/>
    <rect x="219" y="331" width="14" height="34" rx="7"/>
    <rect x="321" y="229" width="34" height="14" rx="7"/>
    <rect x="97" y="229" width="34" height="14" rx="7"/>
    <rect x="216" y="112" width="20" height="136" rx="10"/>
    <rect x="216" y="150" width="20" height="96" rx="10" transform="rotate(120 226 236)"/>
  </g>
  <circle cx="372" cy="378" r="112" fill="#FFCC00"/>
  <circle cx="372" cy="378" r="96" fill="#D40511"/>
  <g fill="#FFCC00">
    <rect x="324" y="366" width="96" height="24" rx="12"/>
    <rect x="360" y="330" width="24" height="96" rx="12"/>
  </g>
'''

ICON_SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="0" y="0" width="512" height="512" rx="120" fill="#FFCC00"/>
  {ART}
</svg>'''

SQUARE_SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="0" y="0" width="512" height="512" fill="#FFCC00"/>
  {ART}
</svg>'''

MASKABLE_SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="0" y="0" width="512" height="512" fill="#FFCC00"/>
  <g transform="translate(271,279) scale(0.78) translate(-271,-279)">
    {ART}
  </g>
</svg>'''


def render(svg, w, h):
    return cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=w, output_height=h)


# Save the canonical svg
(PUB / "smarttime-icon.svg").write_text(ICON_SVG, encoding="utf-8")

# PWA / app icons
(PUB / "icon-192.png").write_bytes(render(ICON_SVG, 192, 192))
(PUB / "icon-512.png").write_bytes(render(ICON_SVG, 512, 512))
(PUB / "icon-maskable-512.png").write_bytes(render(MASKABLE_SVG, 512, 512))
(PUB / "apple-touch-icon.png").write_bytes(render(SQUARE_SVG, 180, 180))

# favicon.ico from square version
sq = Image.open(BytesIO(render(SQUARE_SVG, 256, 256))).convert("RGBA")
sq.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

print("Icons regenerated:", [p.name for p in PUB.glob("icon*.png")], "+ apple-touch-icon.png, favicon.ico")
