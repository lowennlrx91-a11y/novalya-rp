#!/usr/bin/env python3
"""
Convertit une police (woff2/ttf/otf) en JSON "typeface" utilisable par THREE.FontLoader / TextGeometry.

Usage :
    python3 tools/make_typeface.py fonts/montserrat-latin-800-italic.woff2 src/montserrat-800-italic.typeface.json

Dépendances : pip install fonttools brotli skia-pathops
"""
import json
import sys

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont


class TypefacePen(BasePen):
    """Traduit les contours d'un glyphe dans le mini-langage de THREE.Font (m / l / q / b)."""

    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.cmds = []

    @staticmethod
    def _r(v):
        return str(int(round(v)))

    def _moveTo(self, pt):
        self.cmds += ["m", self._r(pt[0]), self._r(pt[1])]

    def _lineTo(self, pt):
        self.cmds += ["l", self._r(pt[0]), self._r(pt[1])]

    def _curveToOne(self, c1, c2, pt):
        # three : b  finX finY  ctrl1X ctrl1Y  ctrl2X ctrl2Y
        self.cmds += ["b", self._r(pt[0]), self._r(pt[1]),
                      self._r(c1[0]), self._r(c1[1]),
                      self._r(c2[0]), self._r(c2[1])]

    def _qCurveToOne(self, c, pt):
        # three : q  finX finY  ctrlX ctrlY
        self.cmds += ["q", self._r(pt[0]), self._r(pt[1]),
                      self._r(c[0]), self._r(c[1])]

    def _closePath(self):
        pass

    def _endPath(self):
        pass


def main(src, dst):
    font = TTFont(src)
    # Les polices modernes ont des contours qui se chevauchent : une fois extrudés en 3D,
    # cela crée de fines rayures sur les lettres. On fusionne donc les chevauchements.
    try:
        from fontTools.ttLib.removeOverlaps import removeOverlaps
        removeOverlaps(font)
        print("chevauchements supprimés")
    except Exception as e:  # skia-pathops absent
        print("ATTENTION : chevauchements conservés (", e, ")")
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    hmtx = font["hmtx"]
    upem = font["head"].unitsPerEm
    is_cff = "CFF " in font or "CFF2" in font

    glyphs = {}
    # ASCII imprimable + quelques caractères français courants
    chars = [chr(c) for c in range(32, 127)] + list("àâäçéèêëîïôöùûüÿœÀÂÇÉÈÊËÎÏÔÖÙÛÜŒ’")
    for ch in chars:
        code = ord(ch)
        if code not in cmap:
            continue
        name = cmap[code]
        pen = TypefacePen(glyph_set)
        glyph_set[name].draw(pen)
        adv = hmtx[name][0]
        glyphs[ch] = {"ha": adv, "x_min": 0, "x_max": adv, "o": " ".join(pen.cmds)}

    hhea = font["hhea"]
    data = {
        "glyphs": glyphs,
        "familyName": font["name"].getDebugName(1) or "Font",
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "underlinePosition": -100,
        "underlineThickness": 50,
        "boundingBox": {"yMin": -300, "xMin": -100, "yMax": 1100, "xMax": 1200},
        "resolution": upem,
        "original_font_information": {},
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(glyphs)} glyphes, unitsPerEm={upem}, CFF={is_cff} -> {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
