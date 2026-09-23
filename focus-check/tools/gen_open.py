import numpy as np, soundfile as sf, subprocess, warnings, json
warnings.filterwarnings("ignore")
from kokoro_onnx import Kokoro
from prosody import reshape_pitch
from script import TEACHER, SAM
SR=24000
k = Kokoro("kokoro-full.onnx", "voices.bin")
def tts(voice, text):
    v,lang,speed,fac = voice
    s,sr = k.create(text, voice=v, speed=speed, lang=lang)
    s = s.astype(np.float32)
    return reshape_pitch(s, SR, factor=fac)
def db(x): return 10**(x/20)
def norm(x, target=-20):
    m = x if x.ndim==1 else x.mean(1); a = np.abs(m) > 0.02
    return x*(db(target)/np.sqrt(np.mean(m[a]**2)))
def limit(x): pk=np.abs(x).max(); return x*(0.95/pk) if pk>0.95 else x
def pitch(x, f):
    sf.write("tmp_in.wav", x, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af",f"asetrate={int(SR*f)},aresample={SR},atempo={1/f:.4f}","tmp_out.wav"],check=True)
    y,_=sf.read("tmp_out.wav",dtype='float32'); return y
def pan_st(x,p): a=(p+1)*np.pi/4; return np.stack([x*np.cos(a), x*np.sin(a)],axis=1)
def seq(lines):
    parts=[]
    for text,pause,g in lines:
        parts += [norm(tts(TEACHER,text))*db(g), np.zeros(int(pause*SR),dtype=np.float32)]
    return np.concatenate(parts)
out = {}
a = seq([("Okay, everyone! Settle down!", 0.3, 1)])
b = seq([("Excuse me! I said quiet, please!", 0.3, 3)])
c_teacher = seq([("Thank you! Right. I'm going to read you a story.", 0.35, 0),
                 ("And listen carefully, because I'm going to quiz you on it afterwards!", 0.2, 0)])
groan = norm(pitch(tts(SAM, "A quiz? Seriously?"), 1.18))*db(-6)
start = len(c_teacher)/SR - 0.05
total = int((start + len(groan)/SR + 0.6)*SR)
c = np.zeros((total,2),dtype=np.float32)
st = np.stack([c_teacher, c_teacher],axis=1)*np.sqrt(0.5); c[:len(st)] += st
i0 = int(start*SR); g2 = pan_st(groan, -0.55); c[i0:i0+len(g2)] += g2
for name,x in [("s1_open_a",a),("s1_open_b",b),("s1_open_c",c)]:
    x = limit(x); sf.write(f"wav/{name}.wav", x, SR)
    br = "56k" if x.ndim==2 else "48k"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"wav/{name}.wav","-codec:a","libmp3lame","-b:a",br,f"mp3/{name}.mp3"],check=True)
    print(name, round(len(x)/SR,2), "s")
