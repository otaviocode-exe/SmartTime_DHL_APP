import cairosvg
from PIL import Image
from io import BytesIO
from pathlib import Path

PUB = Path("/app/frontend/public")

# Transparent SmartTime icon (red clock + yellow "+" badge, NO yellow background)
ICON_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<g transform="matrix(1,0,0,-1,0,512)">
<path stroke-width="28" stroke-linecap="butt" fill="none" stroke="#d40511" d="M402 274C402 364.5747 328.5747 438 238 438 147.4253 438 74 364.5747 74 274 74 183.4253 147.4253 110 238 110 328.5747 110 402 183.4253 402 274"/>
<path stroke-width="18" stroke-linecap="round" fill="none" stroke="#d40511" d="M238 406V426"/>
<path stroke-width="18" stroke-linecap="round" fill="none" stroke="#d40511" d="M238 122V142"/>
<path stroke-width="18" stroke-linecap="round" fill="none" stroke="#d40511" d="M86 274H106"/>
<path stroke-width="18" stroke-linecap="round" fill="none" stroke="#d40511" d="M370 274H390"/>
<path stroke-width="26" stroke-linecap="round" fill="none" stroke="#d40511" d="M238 274V366"/>
<path stroke-width="26" stroke-linecap="round" fill="none" stroke="#d40511" d="M238 274 311 216"/>
<path d="M453 137C453 180.0782 418.0782 215 375 215 331.9218 215 297 180.0782 297 137 297 93.92179 331.9218 59 375 59 418.0782 59 453 93.92179 453 137" fill="#d40511" fill-rule="evenodd"/>
<path stroke-width="24" stroke-linecap="round" fill="none" stroke="#ffcc00" d="M340 137H410"/>
<path stroke-width="24" stroke-linecap="round" fill="none" stroke="#ffcc00" d="M375 102V172"/>
</g>
</svg>'''


def render(svg, w, h):
    return cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=w, output_height=h)


(PUB / "smarttime-icon.svg").write_text(ICON_SVG, encoding="utf-8")
(PUB / "icon-192.png").write_bytes(render(ICON_SVG, 192, 192))
(PUB / "icon-512.png").write_bytes(render(ICON_SVG, 512, 512))
(PUB / "icon-maskable-512.png").write_bytes(render(ICON_SVG, 512, 512))
(PUB / "apple-touch-icon.png").write_bytes(render(ICON_SVG, 180, 180))

img = Image.open(BytesIO(render(ICON_SVG, 256, 256))).convert("RGBA")
img.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

print("Transparent icons regenerated.")
