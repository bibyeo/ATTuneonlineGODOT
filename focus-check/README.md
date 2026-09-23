# ATTune Focus Check

A five to seven minute listening game used as a pre-screening funnel for ATTune. Three
scenes test how well someone follows speech in noise, holds on to interrupted instructions,
and stays with something long and boring while other things compete for attention.

It is a game, **not** a diagnostic test, and it says so on screen.

Players type a first name and age on the first screen, and the game sets its difficulty from
the age. Name and age stay in the browser; nothing is stored or sent anywhere.

## Quickest way to share a playable link

1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. Netlify gives you a public link in about a minute. Send that to anyone.

Or use GitHub Pages: push this folder to a repo, then Settings, Pages, deploy from the `main` branch.

## Phones

- The game runs in full 3D on phones and asks players to turn the phone sideways.
- The Ring/Silent switch on iPhones mutes web audio. Players need it off (no orange showing).
- Rendering pauses while the keyboard is open (iOS freezes animation then), and the keyboard is
  closed automatically when the game starts.

## Run it locally

Audio is loaded with `fetch`, so opening `index.html` from disk will not work. Serve the
folder:

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

## Deploy

Any static host works (Cloudflare Pages, Netlify, GitHub Pages). Upload the whole folder.
About 3.3 MB, nearly all audio. Two things load from the internet at runtime: three.js from
jsDelivr and two fonts from Google Fonts. Self-host both if it must work offline.

## Age bands

Set in `AGE_BANDS` in `js/data.js`. Each band controls the chatter level in stage 1, the
answer timers, which instruction rounds are used, and which final stage runs.

| Age | Stage 1 noise | Stage 2 | Stage 3 |
|---|---|---|---|
| 5 to 7 | gentlest, 22s per question | 1 simple round (2 steps) | School assembly |
| 8 to 9 | gentle, 20s | 2 simple rounds (2, 3 steps) | School assembly |
| 10 to 12 | medium, 17s | 2 school rounds (2, 3 steps) | School assembly |
| 13 to 15 | harder, 14s | 3 rounds (2, 3, 4 steps) | Lecture with notes |
| 16 to 18 | harder, 12s | 4 rounds (2, 3, 4, 5 steps) | Lecture with notes |
| Adults | hardest, 12s | 4 rounds, tightest timers | Lecture with notes |

## The three stages

**1. What did the teacher say?** A story read aloud while classroom chatter rises. The class
settles when the teacher asks, then the noise creeps back up. Six comprehension questions.
Score: questions correct.

**2. What did she ask you to do?** Rounds of spoken instructions that grow from 2 to 5 steps,
interrupted by classmates. Some interruptions overrule an earlier instruction (black pen
becomes blue). Players tap the steps in order.

Scoring follows the "following instructions" paradigm from working memory research: steps
recalled in the correct serial position, plus separate error counts for omissions,
intrusions (things said to someone else), order errors, and update errors (taking the
overruled instruction). Also reports instruction span.

**3a. The world's most boring lecture (13+).** A monotone lecture on soil drainage while two
students gossip and someone plays a game. Players take notes, then write a summary.
Score: note completeness, the percentage of six key points captured, plus a summary mark.
Bands are anchored to note-taking research (students record roughly a third of a lecturer's
ideas overall, about nine in ten of the top-level ones).

**3b. The longest assembly ever (under 13).** The principal explains a zoo trip while kids
whisper about a horse in the field. Players tap every time they hear "zoo" (7 targets), then
answer three questions plus one about the whispers. Score: hits, misses, wrong taps and
question accuracy. No typing, no AI marking needed.

Per-round raw data lives in the `state` object, ready to post to a backend.

**The score bands are not norms.** Collect your own data per age group and report percentiles.

## AI marking (13+ only)

Inside Claude, the page asks Claude to mark lecture notes using the viewer's own account.
Anywhere else that is unavailable and the game falls back to keyword matching
(`keywordGrade` in `js/flow.js`), telling the player it did so.

To keep AI marking on your own domain, add a serverless function (Cloudflare Worker, Vercel
or Netlify function) holding your Anthropic API key. It should accept `{notes, summary}`,
send the prompt from `gradeNotes`, and return the JSON. Never put the key in the page, and
rate-limit the endpoint.

## Files

| Path | What it is |
|---|---|
| `index.html` | Page shell: loading screen, name and age fields, HUD, question box, notes panel |
| `css/style.css` | All styling |
| `js/data.js` | Age bands, questions, instruction rounds, lecture transcript, key points, assembly |
| `js/meta.js` | Generated timings for interruptions, whispers and target words |
| `js/audio.js` | Audio engine: loading, playback, levels, room tone, sound effects |
| `js/scene.js` | 3D rooms, low-poly people, camera, laptop game |
| `js/flow.js` | Game flow, scoring, AI marking, results |
| `audio/*.mp3` | Teacher, classmates, lecturer, principal, gossip, whispers, chatter |
| `tools/*.py` | Voice generation scripts |

## Regenerating the voices

Voices come from Kokoro TTS, then get reshaped with Praat (via parselmouth): the teacher's
pitch movement is exaggerated, the lecturer's is flattened.

```bash
pip install kokoro-onnx soundfile praat-parselmouth
curl -L -o kokoro-full.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o voices.bin       https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
mkdir -p wav mp3
python3 tools/gen.py           # story, chatter, instruction rounds 1-2, lecture, gossip
python3 tools/gen_open.py      # the settle-down opening and quiz warning
python3 tools/gen_rounds.py    # instruction rounds 3-4
python3 tools/gen_lecture.py   # the lecturer alone (arguments: voice lang outname)
python3 tools/gen_kids.py      # assembly, kid whispers, simple instruction rounds
```

Scripts write into `wav/` and `mp3/` and update `meta.json`. Copy the MP3s into `audio/` and
the timings into `js/meta.js`. To use recordings from a voice service or real actors instead,
just replace the MP3 files, keeping the same names, and update the timings in `js/meta.js`
for anything with an interruption or target word.

## Single-file build

```bash
python3 tools/build-standalone.py
```

## Known limits

- Needs WebGL. Without it the rooms are blank, but the test still runs.
- The story in stage 1 is the same for every age and is probably long for a 5-year-old.
- Answer tiles need reading; picture answers would suit the youngest players better.
- Grammarly and similar extensions can rewrite notes mid-test. Disable for sessions.
