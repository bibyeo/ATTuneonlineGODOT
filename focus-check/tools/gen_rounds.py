import numpy as np, soundfile as sf, subprocess, warnings, json
warnings.filterwarnings("ignore")
from kokoro_onnx import Kokoro
from prosody import reshape_pitch
from script import TEACHER, SAM, MIA, LEO
SR=24000
k = Kokoro("kokoro-full.onnx", "voices.bin")
def tts(voice, text):
    v,lang,speed,fac = voice
    s,_ = k.create(text, voice=v, speed=speed, lang=lang)
    return reshape_pitch(s.astype(np.float32), SR, factor=fac)
def db(x): return 10**(x/20)
def norm(x, t=-20):
    m = x if x.ndim==1 else x.mean(1); a=np.abs(m)>0.02
    return x*(db(t)/np.sqrt(np.mean(m[a]**2)))
def limit(x): pk=np.abs(x).max(); return x*(0.95/pk) if pk>0.95 else x
def pitch(x,f):
    sf.write("tmp_in.wav", x, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af",f"asetrate={int(SR*f)},aresample={SR},atempo={1/f:.4f}","tmp_out.wav"],check=True)
    y,_=sf.read("tmp_out.wav",dtype='float32'); return y
def pan_st(x,p): a=(p+1)*np.pi/4; return np.stack([x*np.cos(a), x*np.sin(a)],axis=1)
def stereo(x): return np.stack([x,x],axis=1)*np.sqrt(0.5)

ROUNDS = {
 "s2_r3": [
   ("T", "Next! When the bell goes, put your worksheet in the tray by the door.", 0.15, 0),
   ("T", "Leo! Sit down! The bell hasn't gone yet!", 0.5, 3),
   ("K", LEO, "Aw, come on!", -0.35, 0.55),
   ("T", "Sorry! The tray on my desk, not by the door.", 0.3, 0),
   ("T", "Then stack your chair, remind Sam about his permission slip, and take the register back to the office.", 0.3, 0),
   ("T", "Sam! The window stays closed!", 0.4, 3),
   ("K", SAM, "But it's so hot in here!", -0.3, -0.6),
 ],
 "s2_r4": [
   ("T", "Last one, and it's a long one.", 0.3, 0),
   ("T", "Take the sports gear out of the cupboard.", 0.2, 0),
   ("T", "Mia! Phones in the box, please!", 0.45, 3),
   ("K", MIA, "It's my calculator!", -0.4, 0.6),
   ("T", "Count out twelve cones. No, wait. Twenty cones.", 0.3, 0),
   ("T", "Put them in the blue bag, sign the equipment sheet, and meet me on the field at ten past.", 0.3, 0),
 ],
}
events={}
for name, items in ROUNDS.items():
    ev=[]; parts=[]; t=0.0
    for it in items:
        if it[0]=="T":
            _,text,pause,g = it
            s = norm(tts(TEACHER,text))*db(g)
            parts.append((t, stereo(s))); t += len(s)/SR + pause
        else:
            _,voice,text,off,p = it
            s = norm(pitch(tts(voice,text), 1.18))*db(-5)
            start = max(0.0, t+off)
            parts.append((start, pan_st(s,p)))
            who = "Sam" if voice==SAM else "Mia" if voice==MIA else "Leo"
            ev.append({"t":round(start,2),"d":round(len(s)/SR,2),"text":text,"who":who,"pan":p})
            t = max(t, start + len(s)/SR + 0.15)
    total = int((max(st+len(a)/SR for st,a in parts)+0.3)*SR)
    out = np.zeros((total,2),dtype=np.float32)
    for st,a in parts:
        i=int(st*SR); out[i:i+len(a)] += a
    out = limit(out)
    sf.write(f"wav/{name}.wav", out, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"wav/{name}.wav","-codec:a","libmp3lame","-b:a","56k",f"mp3/{name}.mp3"],check=True)
    events[name]=ev
    print(name, round(len(out)/SR,2), "s", ev)
meta=json.load(open("meta.json")); meta["kids"].update(events); json.dump(meta, open("meta.json","w"))
