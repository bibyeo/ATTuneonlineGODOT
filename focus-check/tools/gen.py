import numpy as np, soundfile as sf, subprocess, random, os, json, warnings
warnings.filterwarnings("ignore")
from kokoro_onnx import Kokoro
from script import *
from prosody import reshape_pitch, spread
SR=24000
k = Kokoro("kokoro-full.onnx", "voices.bin")
os.makedirs("wav", exist_ok=True)
cache={}
def tts(voice, text):
    key=(voice,text)
    if key in cache: return cache[key]
    v,lang,speed=voice[:3]
    fac = voice[3] if len(voice) > 3 else 1.0
    s,sr=k.create(text, voice=v, speed=speed, lang=lang)
    assert sr==SR and len(s)>SR*0.3, (voice,text,len(s))
    s=s.astype(np.float32)
    if abs(fac-1.0) > 0.01:
        s=reshape_pitch(s, SR, factor=fac, shift_st=(-1.0 if fac < 1 else 0.0))
    cache[key]=s
    return s
def db(x): return 10**(x/20)
def active_rms(x):
    m = np.abs(x) > 0.02
    return float(np.sqrt(np.mean(x[m]**2))) if m.any() else 1e-6
def norm(x, target_db=-20):
    r=active_rms(x if x.ndim==1 else x.mean(axis=1))
    return x*(db(target_db)/r)
def pitch(x, factor):
    sf.write("tmp_in.wav", x, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af",f"asetrate={int(SR*factor)},aresample={SR},atempo={1/factor:.4f}","tmp_out.wav"],check=True)
    y,_=sf.read("tmp_out.wav",dtype='float32'); return y
def pan_st(x, p):  # constant power pan, p in [-1,1]
    a=(p+1)*np.pi/4
    return np.stack([x*np.cos(a), x*np.sin(a)],axis=1)
def to_stereo(x): return np.stack([x,x],axis=1)*np.sqrt(0.5)
def limit(x):
    pk=np.abs(x).max()
    return x*(0.95/pk) if pk>0.95 else x

meta={}
def save(name, x):
    x=limit(x)
    sf.write(f"wav/{name}.wav", x, SR)
    meta[name]=round(len(x)/SR,2)

# Simple sequential clips (mono)
for name, lines in CLIPS.items():
    parts=[]
    for voice,text,pause,g in lines:
        s=norm(tts(voice,text))*db(g)
        parts += [s, np.zeros(int(pause*SR),dtype=np.float32)]
    save(name, np.concatenate(parts))

# Stage 2 rounds (stereo with kid interjections)
kid_events={}
for name, items in ROUNDS.items():
    events=[]; t=0.0; last_start=0.0
    for it in items:
        if it[0]=="T":
            _,text,pause,g = it
            s=norm(tts(TEACHER,text))*db(g)
            events.append((t, to_stereo(s))); last_start=t
            t += len(s)/SR + pause
        else:
            _,voice,text,off,p = it
            s=norm(pitch(tts(voice,text),1.18))*db(-5)
            start = max(0.0, t + off)
            events.append((start, pan_st(s,p)))
            kid_events.setdefault(name, []).append({"t":round(start,2),"d":round(len(s)/SR,2),"text":text,"who":("Sam" if voice==SAM else "Mia" if voice==MIA else "Leo"),"pan":p})
            t = max(t, start + len(s)/SR + 0.15)
    total=max(st+len(a)/SR for st,a in events)+0.3
    out=np.zeros((int(total*SR),2),dtype=np.float32)
    for st,a in events:
        i=int(st*SR); out[i:i+len(a)] += a
    save(name,out)

# Lecture (mono), with pauses; record sentence times
parts=[]; t=0; lect_marks=[]
for i,txt in enumerate(LECTURE):
    s=norm(tts(LECTURER,txt))
    lect_marks.append(round(t,2))
    pause=0.9 if i in (0,4,6,10) else 0.55
    parts += [s, np.zeros(int(pause*SR),dtype=np.float32)]
    t += len(s)/SR+pause
lecture=np.concatenate(parts); save("s3_lecture", lecture)
LEN=len(lecture)/SR

# Gossip track aligned to lecture length, whispered (highpassed), panned left
g_out=np.zeros((len(lecture),2),dtype=np.float32)
t=9.0
gossip_events=[]
for i,(voice,txt) in enumerate(GOSSIP):
    s=norm(tts(voice,txt))
    sf.write("tmp_in.wav", s, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af","highpass=f=280,lowpass=f=7000","tmp_out.wav"],check=True)
    s,_=sf.read("tmp_out.wav",dtype='float32'); s=norm(s)
    p = -0.75 if voice==GOSS1 else -0.45
    i0=int(t*SR)
    if i0+len(s) >= len(g_out): break
    g_out[i0:i0+len(s)] += pan_st(s,p)
    gossip_events.append({"t":round(t,2),"d":round(len(s)/SR,2),"who":1 if voice==GOSS1 else 2})
    gap = 0.35 if i%2==0 else 0.25
    if i in (5,9): gap = 3.5
    t += len(s)/SR + gap
meta["gossip_end"]=round(t,2)
save("s3_gossip", g_out)

# Chatter bed, 30 s seamless loop, stereo
random.seed(4)
L=30.0; bed=np.zeros((int(L*SR),2),dtype=np.float32)
lines=[]
for vi,(v,lang) in enumerate(CHATTER_VOICES):
    for li in random.sample(range(len(CHATTER_LINES)), 5):
        lines.append(((v,lang,1.08,1.5), CHATTER_LINES[li]))
random.shuffle(lines)
for n,(voice,txt) in enumerate(lines):
    s=tts(voice,txt)
    s=norm(pitch(s, random.uniform(1.12,1.3)))*db(random.uniform(-7,0))
    st=pan_st(s, random.uniform(-0.9,0.9))
    start=int(random.uniform(0,L)*SR)
    for j in range(len(st)):
        pass
    idx=(np.arange(len(st))+start) % len(bed)
    np.add.at(bed, idx, st)
bed=norm(bed)
save("chatter", bed)

json.dump({"durations":meta,"lecture_marks":lect_marks,"kids":kid_events,"gossip":gossip_events}, open("meta.json","w"), indent=1)
print(json.dumps(meta, indent=1))
