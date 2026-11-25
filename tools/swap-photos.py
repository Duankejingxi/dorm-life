# 换图记录（依赖本地 Open Images 元数据与 EDSR 模型，见 README）
"""替换一批不贴题的场景照片：裁边 → EDSR×2 → 旧版底色调色 → img/<key>.jpg，并更新 credits.json。之后用 tools/grade.py 生成 webp。"""
import os, sys, json, time
import numpy as np, cv2
from PIL import Image, ImageFilter, ImageOps
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
OUT = "/home/user/dorm-life/img"
src = open(os.path.join(D, "process.py"), encoding="utf8").read()
ns = {"__file__": os.path.join(D, "process.py")}
exec(src.split("credits = {}")[0].replace("from q import meta", "meta = None"), ns)
trim_border, grade = ns["trim_border"], ns["grade"]
from q import meta

SWAP = {
    "field-day": "d959e9d0", "hospital": "123528b6",
    "library-day": "aff71bd7", "library-night": "44873a67", "library-dawn": "f8c40ffc",
    "classroom-day": "a173420c", "classroom-dusk": "51d93439", "classroom-night": "96edcc93",
    "dorm-day": "7f312a3c", "dorm-night": "1cbf8209", "dormout-day": "9e92907c",
}
imgs = os.listdir(os.path.join(D, "img"))
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(os.path.join(D, "..", "sr", "EDSR_x2.pb")); sr.setModel("edsr", 2)
cred = json.load(open(os.path.join(OUT, "credits.json"), encoding="utf8"))
for key, pre in SWAP.items():
    t = time.time()
    f = [x for x in imgs if x.startswith(pre)][0]; iid = f[:-4]
    im = trim_border(ImageOps.exif_transpose(Image.open(os.path.join(D, "img", f))).convert("RGB"))
    up = sr.upsample(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR))
    im = Image.fromarray(cv2.cvtColor(up, cv2.COLOR_BGR2RGB))
    w, h = im.size; maxw = 2048 if w >= h else 1400
    if w > maxw: im = im.resize((maxw, round(h * maxw / w)), Image.LANCZOS)
    im = grade(im).filter(ImageFilter.UnsharpMask(radius=1.0, percent=25, threshold=3))
    im.save(os.path.join(OUT, key + ".jpg"), quality=84, optimize=True, progressive=True)
    m = meta[iid]
    cred[key] = {"id": iid, "author": m[2], "title": m[5], "url": m[3], "license": "CC BY 2.0"}
    json.dump(cred, open(os.path.join(OUT, "credits.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(key, iid, im.size, round(time.time() - t), "s", flush=True)
print("ALL DONE", flush=True)
