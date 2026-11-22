#!/usr/bin/env python3
"""给所有场景照片套同一套“胶片”调色，输出 img/*.webp（jpg 原图不动，随时可以重新生成）。

用法：python3 tools/grade.py [输出目录，默认 img] [只处理的文件名…]
需要：pip install numpy pillow

为什么要做：照片来自不同的摄影师、不同的相机，色温、反差、饱和度各不相同，
放在一起就像图库拼贴。统一一层调色，它们才像同一部电影里的镜头。

调色（参考 Portra / Fuji 400H 一类的胶片质感）：
  1. 饱和度收到 0.78，皮肤和霓虹不再刺眼
  2. 黑位抬到 0.035，白位压到 0.965 —— 不再有死黑和死白
  3. 轻微 S 曲线，保留中间调层次
  4. 分离色调：暗部偏青，亮部偏暖
  5. 高光“光晕”（halation）：亮处的红通道向外晕开一点，像胶片的乳剂层
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "img")
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else SRC
ONLY = set(sys.argv[2:])


def grade(im):
    a = np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0
    luma = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    l3 = luma[..., None]
    # 1. 饱和度
    a = l3 + (a - l3) * 0.78
    # 3. 轻微 S 曲线（与原值 3:1 混合）
    s = a * a * (3 - 2 * a)
    a = a * 0.75 + s * 0.25
    # 4. 分离色调
    sh = ((1 - l3) ** 2)
    hi = (l3 ** 2)
    a = a + sh * np.array([-0.016, 0.006, 0.028], dtype=np.float32) + hi * np.array([0.032, 0.012, -0.026], dtype=np.float32)
    # 5. 高光光晕
    bright = np.clip((luma - 0.72) / 0.28, 0, 1)
    glow = Image.fromarray((bright * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=max(im.size) / 90))
    g = np.asarray(glow, dtype=np.float32)[..., None] / 255.0
    a = a + g * np.array([0.10, 0.035, 0.0], dtype=np.float32)
    # 2. 黑位 / 白位
    a = 0.035 + np.clip(a, 0, 1) * (0.965 - 0.035)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".jpg"):
            continue
        key = f[:-4]
        if ONLY and key not in ONLY:
            continue
        out = grade(Image.open(os.path.join(SRC, f)))
        out.save(os.path.join(OUT, key + ".webp"), "WEBP", quality=82, method=6)
        print(key)
