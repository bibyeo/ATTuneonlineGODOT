import parselmouth, numpy as np
from parselmouth.praat import call
def reshape_pitch(x, sr=24000, factor=1.4, shift_st=0.0, floor=75, ceil=600):
    """factor>1 exaggerates pitch movement, factor<1 flattens it. Overlap-add resynthesis."""
    snd = parselmouth.Sound(x.astype(np.float64), sr)
    man = call(snd, "To Manipulation", 0.01, floor, ceil)
    tier = call(man, "Extract pitch tier")
    pitch = snd.to_pitch(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceil)
    f = pitch.selected_array['frequency']; f = f[f>0]
    if len(f) < 5: return x
    med = float(np.median(f))
    # f' = med * (f/med)^factor * 2^(shift/12)
    call(tier, "Formula", f"{med} * (self/{med})^{factor} * 2^({shift_st}/12)")
    call([man, tier], "Replace pitch tier")
    out = call(man, "Get resynthesis (overlap-add)")
    y = out.values[0].astype(np.float32)
    n = min(len(y), len(x)); y = y[:n]
    return y
def spread(x, sr=24000):
    snd = parselmouth.Sound(x.astype(np.float64), sr)
    p = snd.to_pitch(time_step=0.01, pitch_floor=75, pitch_ceiling=600)
    f = p.selected_array['frequency']; f = f[f>0]
    return float(np.std(12*np.log2(f/np.median(f))))
