import numpy as np, soundfile as sf, subprocess, warnings, json
warnings.filterwarnings("ignore")
from kokoro_onnx import Kokoro
from prosody import reshape_pitch
from script import TEACHER, SAM, MIA
SR=24000
k = Kokoro("kokoro-full.onnx","voices.bin")
PRINCIPAL = ("bf_emma","en-gb",0.94,1.25)
W1 = ("af_bella","en-us",1.06,1.5)
W2 = ("bf_lily","en-gb",1.04,1.5)
def tts(voice, text):
    v,lang,speed,fac = voice
    s,_ = k.create(text, voice=v, speed=speed, lang=lang)
    return reshape_pitch(s.astype(np.float32), SR, factor=fac)
def db(x): return 10**(x/20)
def norm(x,t=-20):
    m = x if x.ndim==1 else x.mean(1); a=np.abs(m)>0.02
    return x*(db(t)/np.sqrt(np.mean(m[a]**2)))
def limit(x): pk=np.abs(x).max(); return x*(0.95/pk) if pk>0.95 else x
def pitch(x,f):
    sf.write("tmp_in.wav", x, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af",f"asetrate={int(SR*f)},aresample={SR},atempo={1/f:.4f}","tmp_out.wav"],check=True)
    y,_=sf.read("tmp_out.wav",dtype='float32'); return y
def pan_st(x,p): a=(p+1)*np.pi/4; return np.stack([x*np.cos(a), x*np.sin(a)],axis=1)
def stereo(x): return np.stack([x,x],axis=1)*np.sqrt(0.5)

# ---- assembly: each line is (before-and-including target word, rest). target = "zoo"
LINES = [
 ("Good morning, everyone. Settle down, please.", None, 0.6),
 ("Sit up nice and tall.", None, 0.7),
 ("On Friday, the whole class is going on a trip to the zoo.", "", 0.7),
 ("The bus leaves at nine o'clock, so please be at school by half past eight.", None, 0.7),
 ("When we get to the zoo,", " we will be in three groups. Red group, blue group, and green group.", 0.6),
 ("Red group will start at the penguins. Blue group will start at the monkeys.", None, 0.6),
 ("Green group will start with the big lizards.", None, 0.7),
 ("You need to bring a packed lunch, a raincoat, and a water bottle.", None, 0.7),
 ("You do not need any money, because there are no shops at the zoo.", "", 0.7),
 ("Please do not bring toys from home.", None, 0.7),
 ("The zoo,", " is open even if it rains, so we are going whatever the weather.", 0.6),
 ("If you feel lost at the zoo,", " find a grown-up in a yellow jacket.", 0.7),
 ("Last year, the zoo,", " was very busy, so stay with your group.", 0.7),
 ("We will be back at school by three o'clock.", None, 0.7),
 ("So remember. Packed lunch. Raincoat. Water bottle.", None, 0.6),
 ("Thank you, everyone, and enjoy your day at the zoo.", "", 0.5),
]
parts=[]; t=0.0; targets=[]
for head, tail, pause in LINES:
    a = norm(tts(PRINCIPAL, head))
    parts.append((t, stereo(a)))
    if tail is not None:                      # the word "zoo" ends this first chunk
        targets.append(round(t + len(a)/SR - 0.32, 2))
    t += len(a)/SR
    if tail:
        b = norm(tts(PRINCIPAL, tail.strip()))
        parts.append((t + 0.05, stereo(b))); t += 0.05 + len(b)/SR
    t += pause
total = int((t+0.5)*SR); out = np.zeros((total,2),dtype=np.float32)
for st,a in parts:
    i=int(st*SR); out[i:i+len(a)] += a
out = limit(out)
sf.write("wav/k3_assembly.wav", out, SR)
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","wav/k3_assembly.wav","-codec:a","libmp3lame","-b:a","56k","mp3/k3_assembly.mp3"],check=True)
print("assembly", round(len(out)/SR,1), "s | targets:", targets)

# ---- kid whispers about the horse in the field
WHISPERS = [
 (W1,"Psst. Did you see the field?"),(W2,"No. What?"),(W1,"There is a horse in it."),
 (W2,"A horse? At school?"),(W1,"It is just standing there, eating the grass."),
 (W2,"Is it somebody's horse?"),(W1,"Nobody knows. Mr Patel tried to catch it."),
 (W2,"Did he get it?"),(W1,"No! It walked away from him. Very slowly."),
 (W2,"That is so funny."),(W1,"I am going to go and look at lunchtime."),
]
g = np.zeros((total,2),dtype=np.float32); tt=8.0; ev=[]
for i,(voice,txt) in enumerate(WHISPERS):
    s = norm(tts(voice, txt))
    sf.write("tmp_in.wav", s, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af","highpass=f=280,lowpass=f=7000","tmp_out.wav"],check=True)
    s,_ = sf.read("tmp_out.wav", dtype='float32'); s = norm(pitch(s, 1.16))
    i0=int(tt*SR)
    if i0+len(s) >= total: break
    g[i0:i0+len(s)] += pan_st(s, -0.7 if voice==W1 else -0.4)
    ev.append({"t":round(tt,2),"d":round(len(s)/SR,2),"who":1 if voice==W1 else 2})
    tt += len(s)/SR + (0.3 if i%2==0 else 2.6)
g = limit(g)
sf.write("wav/k3_whispers.wav", g, SR)
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","wav/k3_whispers.wav","-codec:a","libmp3lame","-b:a","56k","mp3/k3_whispers.mp3"],check=True)
print("whispers", round(len(g)/SR,1), "s |", len(ev), "lines")

# ---- simple instruction rounds for younger players
SIMPLE = {
 "k2_r1": [("T","Okay! First, put the red book on the shelf.",0.15,0),
           ("T","Sam! Sit down, please!",0.45,3),
           ("K",SAM,"I am sitting down!",-0.4,-0.6),
           ("T","Put the red book on the shelf, and then get your lunchbox.",0.3,0)],
 "k2_r2": [("T","Next! Get the blue crayons.",0.2,0),
           ("T","Oh, no, wait. The green crayons.",0.35,0),
           ("T","Mia! Hands to yourself, please!",0.45,3),
           ("K",MIA,"It was not me!",-0.4,0.6),
           ("T","Get the green crayons, draw a big sun, and then wash your hands.",0.3,0)],
}
kid_ev={}
for name, items in SIMPLE.items():
    evs=[]; segs=[]; tm=0.0
    for it in items:
        if it[0]=="T":
            _,text,pause,gdb = it
            s = norm(tts(TEACHER,text))*db(gdb)
            segs.append((tm, stereo(s))); tm += len(s)/SR + pause
        else:
            _,voice,text,off,p = it
            s = norm(pitch(tts(voice,text),1.18))*db(-5)
            start = max(0.0, tm+off); segs.append((start, pan_st(s,p)))
            evs.append({"t":round(start,2),"d":round(len(s)/SR,2),"text":text,"who":"Sam" if voice==SAM else "Mia","pan":p})
            tm = max(tm, start+len(s)/SR+0.15)
    tot = int((max(st+len(a)/SR for st,a in segs)+0.3)*SR)
    o = np.zeros((tot,2),dtype=np.float32)
    for st,a in segs:
        i=int(st*SR); o[i:i+len(a)] += a
    o=limit(o); sf.write(f"wav/{name}.wav", o, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"wav/{name}.wav","-codec:a","libmp3lame","-b:a","56k",f"mp3/{name}.mp3"],check=True)
    kid_ev[name]=evs
    print(name, round(len(o)/SR,2),"s")
meta=json.load(open("meta.json")); meta["kids"].update(kid_ev); meta["assembly_targets"]=targets; meta["assembly_whispers"]=ev
json.dump(meta, open("meta.json","w"))
