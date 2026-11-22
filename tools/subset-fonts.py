#!/usr/bin/env python3
"""重新生成内置字体子集。
用法：python3 tools/subset-fonts.py <字体源目录>
字体源目录需要包含（均为 SIL OFL 开源字体）：
  NotoSerifSC-Regular.otf / NotoSerifSC-SemiBold.otf / NotoSerifSC-Black.otf
    （github.com/notofonts/noto-cjk  Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-*.otf）
  Cormorant-Italic.ttf   （github.com/google/fonts  ofl/cormorantgaramond/CormorantGaramond-Italic[wght].ttf）
  PlexMono-Regular.ttf   （github.com/google/fonts  ofl/ibmplexmono/IBMPlexMono-Regular.ttf）
需要：pip install fonttools brotli

规则：
  - 正文（400）= 游戏里用到的所有字 + GB2312 一级常用字（玩家起名字也能显示）
  - 半粗 / 特粗（600 / 900）只用于标题，= 游戏里用到的字
  - 用到的字写进 fonts/chars.txt，测试会检查新写的剧情有没有超出字体
"""
import glob, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC:
    sys.exit(__doc__)
OUT = os.path.join(ROOT, "fonts")
os.makedirs(OUT, exist_ok=True)

txt = ""
for f in glob.glob(os.path.join(ROOT, "js", "**", "*.js"), recursive=True) + [os.path.join(ROOT, "index.html")]:
    txt += open(f, encoding="utf8").read()
used = sorted(set(c for c in txt if ord(c) > 0x2E80))
ascii_ = "".join(chr(i) for i in range(32, 127))
punct = "，。、；：？！「」『』（）《》〈〉…—·～￥¥“”‘’【】〇"
lv1 = []
for hi in range(0xB0, 0xD8):
    for lo in range(0xA1, 0xFF):
        try:
            lv1.append(bytes([hi, lo]).decode("gb2312"))
        except UnicodeDecodeError:
            pass
open(os.path.join(OUT, "chars.txt"), "w", encoding="utf8").write("".join(used))
sets = {"used": "".join(used) + ascii_ + punct, "full": "".join(sorted(set(used) | set(lv1))) + ascii_ + punct}

def subset(src, text, out, features="*"):
    tf = os.path.join(OUT, ".tmp-chars.txt")
    open(tf, "w", encoding="utf8").write(text)
    subprocess.run(["pyftsubset", os.path.join(SRC, src), "--text-file=" + tf, "--flavor=woff2", "--layout-features=" + features, "--output-file=" + os.path.join(OUT, out)], check=True)
    os.remove(tf)
    print(out, os.path.getsize(os.path.join(OUT, out)) // 1024, "KB")

subset("NotoSerifSC-Regular.otf", sets["full"], "serif-400.woff2")
subset("NotoSerifSC-SemiBold.otf", sets["used"], "serif-600.woff2")
subset("NotoSerifSC-Black.otf", sets["used"], "serif-900.woff2")
subset("Cormorant-Italic.ttf", ascii_ + "’—–…", "latin-italic.woff2")
subset("PlexMono-Regular.ttf", ascii_ + "¥·—", "mono.woff2")
