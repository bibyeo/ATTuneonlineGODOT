"""Build a single self-contained HTML file (all audio inlined) from this project.

    python3 tools/build-standalone.py     ->  attune-focus-check.html

Handy for emailing or dropping into a chat. For hosting, deploy the folder as-is.
"""
import base64, json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
names = re.findall(r'"([^"]+)"', re.search(r"const CLIPS = \[(.*?)\];", (root/"js/audio.js").read_text(), re.S).group(1))
audio = {n: base64.b64encode((root/f"audio/{n}.mp3").read_bytes()).decode() for n in names}
html = (root/"index.html").read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + (root/"css/style.css").read_text() + "\n</style>")
js = "\n".join((root/f"js/{f}").read_text() for f in ["meta.js","data.js","audio.js","scene.js","flow.js"])
tags = re.search(r'(<script src="js/meta\.js"></script>.*?<script src="js/flow\.js"></script>)', html, re.S).group(1)
html = html.replace(tags, "<script>\nconst AUDIO_BASE64 = " + json.dumps(audio) + ";\n" + js + "\n</script>")
out = root/"attune-focus-check.html"
out.write_text(html)
print(f"wrote {out} ({out.stat().st_size/1e6:.1f} MB)")
