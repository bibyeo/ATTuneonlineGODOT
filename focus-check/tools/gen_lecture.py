import numpy as np, soundfile as sf, subprocess, warnings, random, parselmouth, json
warnings.filterwarnings("ignore")
from parselmouth.praat import call
from kokoro_onnx import Kokoro
SR = 24000
import sys
VOICE = sys.argv[1] if len(sys.argv) > 1 else "bm_george"
LANG = sys.argv[2] if len(sys.argv) > 2 else "en-gb"
OUT = sys.argv[3] if len(sys.argv) > 3 else "s3_lecture"
random.seed(11); np.random.seed(11)
k = Kokoro("kokoro-full.onnx", "voices.bin")

# (text, pause after, sigh after?)
SEGS = [
 ("Right.", 0.7, False),
 ("Good morning.", 0.5, True),
 ("Today's topic is, uh, soil drainage.", 1.1, False),
 ("So. Soil is made from three sizes of mineral particle.", 0.6, False),
 ("Sand.", 0.45, False), ("Silt.", 0.45, False), ("And clay.", 1.0, False),
 ("Sand particles are the largest.", 0.5, False),
 ("Because the gaps between them are large, water drains through sand quickly.", 1.0, False),
 ("Clay particles are the smallest.", 0.5, False),
 ("They pack together, uh, tightly, so clay holds on to water, and drains very slowly.", 1.0, False),
 ("Silt sits somewhere in between.", 0.9, True),
 ("Now.", 0.6, False),
 ("A soil that contains a balanced mix of all three is called loam.", 0.5, False),
 ("Loam is considered the best soil for most garden plants.", 1.1, False),
 ("You can estimate the make-up of your soil with a, uh, a jar test.", 0.8, False),
 ("Half fill a jar with soil, top it up with water, give it a shake, and leave it for twenty-four hours.", 0.8, False),
 ("The sand settles at the bottom.", 0.45, False), ("The silt in the middle.", 0.45, False), ("And the clay on top.", 1.1, True),
 ("If your soil drains poorly, the recommended fix is to dig in organic matter.", 0.45, False),
 ("Compost, for example.", 1.0, False),
 ("A common mistake is adding sand to clay soil.", 0.5, False),
 ("In small amounts, this can make it set hard.", 0.35, False),
 ("Rather like concrete.", 1.2, True),
 ("Right. Well.", 0.6, False),
 ("That concludes today's material on soil drainage.", 0.8, False),
]

def tired_pitch(x, factor=0.8, shift=-1.5, decline=-1.2, tremor=0.12, rate=4.6):
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    dur = snd.duration
    man = call(snd, "To Manipulation", 0.01, 60, 300)
    tier = call(man, "Extract pitch tier")
    f = snd.to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=300).selected_array['frequency']; f = f[f>0]
    if len(f) < 5: return x
    med = float(np.median(f))
    phase = random.random()*6.28
    call(tier, "Formula", f"{med} * (self/{med})^{factor} * 2^(({shift} + {decline}*(x/{dur}) + {tremor}*sin(2*pi*{rate}*x + {phase}))/12)")
    call([man, tier], "Replace pitch tier")
    y = call(man, "Get resynthesis (overlap-add)").values[0].astype(np.float32)
    return y[:len(x)]

def sigh(dur=0.95):
    n = int(dur*SR); t = np.linspace(0, 1, n)
    noise = np.random.randn(n).astype(np.float32)
    env = np.minimum(t/0.28, 1.0) * np.exp(-3.2*np.maximum(t-0.28, 0))
    sf.write("tmp_in.wav", noise*env, SR)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af","highpass=f=300,lowpass=f=1800","tmp_out.wav"], check=True)
    y,_ = sf.read("tmp_out.wav", dtype="float32")
    return y/np.sqrt(np.mean(y**2)) * 10**(-43/20)

def active_rms(x):
    m = np.abs(x) > 0.02
    return float(np.sqrt(np.mean(x[m]**2)))

parts = []
for text, pause, has_sigh in SEGS:
    s,_ = k.create(text, voice=VOICE, speed=random.uniform(0.87, 0.93), lang=LANG)
    s = tired_pitch(s.astype(np.float32))
    s = s * (10**(-20/20) / active_rms(s))
    # words trail off: last 30% of each phrase gets quieter
    n = len(s); fade = np.ones(n, dtype=np.float32); a = int(n*0.7)
    fade[a:] = np.linspace(1.0, 10**(-2.5/20), n-a); s = s*fade
    parts.append(s)
    if has_sigh:
        parts.append(np.zeros(int(0.25*SR), dtype=np.float32)); parts.append(sigh())
    parts.append(np.zeros(int(pause*0.55*SR), dtype=np.float32))
x = np.concatenate(parts)
sf.write("tmp_in.wav", x, SR)
# older, duller voice in a big room
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp_in.wav","-af",
  "highpass=f=70,lowpass=f=7600,equalizer=f=3200:t=q:w=1.2:g=-1.5,equalizer=f=180:t=q:w=1:g=1,aecho=0.9:0.4:38:0.09",
  "tmp_out.wav"], check=True)
y,_ = sf.read("tmp_out.wav", dtype="float32")
y = y * (10**(-20/20) / active_rms(y)); pk = np.abs(y).max()
if pk > 0.95: y *= 0.95/pk
sf.write(f"wav/{OUT}.wav", y, SR)
subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"wav/{OUT}.wav","-codec:a","libmp3lame","-b:a","64k",f"mp3/{OUT}.mp3"], check=True)
p = parselmouth.Sound(y.astype(np.float64), SR).to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=300).selected_array['frequency']; p = p[p>0]
print("duration", round(len(y)/SR,1), "s | median pitch", round(float(np.median(p))), "Hz | spread", round(float(np.std(12*np.log2(p/np.median(p)))),2), "st")
