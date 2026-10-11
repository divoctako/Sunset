"""Project Thailand (and faint neighbours) from Natural Earth into SVG paths.

Source: Natural Earth 1:50m admin-0 countries (public domain).
Usage:  python -I tools/build_map.py <ne_50m_admin_0_countries.geojson>
Writes: source-extracted/thailand-map.json  {viewBox, thailand, neighbours, project}
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "source-extracted" / "thailand-map.json"

# Frame around Thailand (lon/lat)
LON0, LON1 = 96.9, 106.2
LAT0, LAT1 = 5.3, 20.7
K = math.cos(math.radians(13))   # equirectangular, corrected at Thailand's mid latitude
SCALE = 60                       # px per degree latitude
W = round((LON1 - LON0) * K * SCALE)
H = round((LAT1 - LAT0) * SCALE)

NEIGHBOURS = {"MMR", "LAO", "KHM", "MYS", "VNM"}


def proj(lon, lat):
    return (lon - LON0) * K * SCALE, (LAT1 - lat) * SCALE


def ring_path(ring, min_step=0.6):
    pts = []
    last = None
    for lon, lat in ring:
        x, y = proj(lon, lat)
        if last and abs(x - last[0]) < min_step and abs(y - last[1]) < min_step:
            continue
        pts.append((x, y))
        last = (x, y)
    if len(pts) < 3:
        return ""
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"


def geom_path(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return "".join(ring_path(r) for poly in polys for r in poly)


def main(src):
    data = json.loads(Path(src).read_text(encoding="utf-8"))
    thailand, neighbours = "", []
    for f in data["features"]:
        iso = f["properties"].get("ADM0_A3")
        if iso == "THA":
            thailand = geom_path(f["geometry"])
        elif iso in NEIGHBOURS:
            neighbours.append(geom_path(f["geometry"]))
    if not thailand:
        raise SystemExit("Thailand not found")
    OUT.write_text(json.dumps({
        "source": "Natural Earth 1:50m admin-0 countries (public domain)",
        "viewBox": f"0 0 {W} {H}",
        "frame": {"lon0": LON0, "lat1": LAT1, "k": K, "scale": SCALE},
        "thailand": thailand,
        "neighbours": neighbours,
    }), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} viewBox 0 0 {W} {H}, thailand {len(thailand)} chars")


if __name__ == "__main__":
    main(sys.argv[1])
