# voice = (kokoro voice, lang, speed, pitch_factor)
TEACHER = ("bf_alice", "en-gb", 1.04, 1.4)
LECTURER = ("bm_george", "en-gb", 0.84, 0.12)
SAM = ("am_puck", "en-us", 1.1, 1.5)
MIA = ("af_bella", "en-us", 1.08, 1.5)
LEO = ("am_liam", "en-us", 1.06, 1.5)
GOSS1 = ("af_bella", "en-us", 1.1, 1.55)
GOSS2 = ("af_nicole", "en-us", 1.08, 1.55)

CLIPS = {
 "soundcheck": [(TEACHER, "Hi! Can you hear me clearly? Turn your volume up until I'm easy to hear.", 0.2, 0)],
 "s1_open": [
   (TEACHER, "Okay, everyone! Settle down!", 1.3, 0),
   (TEACHER, "Excuse me! I said quiet, please!", 1.1, 2),
   (TEACHER, "Right. Fine! I'm just going to start reading, and you can catch up.", 0.8, 0),
 ],
 "s1_a": [
   (TEACHER, "In the fishing town of Port Mallow, the lighthouse was looked after by an old woman named Agnes Pike.", 0.35, 0),
   (TEACHER, "Every single night, at nine o'clock, she climbed one hundred and twelve steps to light the lamp!", 0.35, 0),
   (TEACHER, "Her only company was a ginger cat called Biscuit, who hated the sea, but absolutely loved sleeping on the warm glass at the top.", 0.3, 0),
 ],
 "s1_b": [
   (TEACHER, "Then, one stormy Tuesday, the lamp would not light!", 0.3, 0),
   (TEACHER, "Biscuit had knocked a cup of tea over the matches, and every single one was soaked!", 0.35, 0),
   (TEACHER, "And out in the dark, a fishing boat called the Silver Gull was heading straight for the rocks!", 0.35, 0),
   (TEACHER, "So Agnes tied a torch to her umbrella, and waved it from the balcony!", 0.3, 0),
 ],
 "s1_c": [
   (TEACHER, "The captain saw the tiny, wobbling light, and turned just in time!", 0.35, 0),
   (TEACHER, "The next morning, he climbed all one hundred and twelve steps, just to say thank you.", 0.3, 0),
   (TEACHER, "He brought a box of dry matches for Agnes, and a small fish for Biscuit.", 0.35, 0),
   (TEACHER, "And from that day on, the matches lived in a tin, and Biscuit was banned from the tea table!", 0.3, 0),
 ],
 "s2_intro": [(TEACHER, "Hey, you! Can you help me out with a few things?", 0.3, 0)],
}

ROUNDS = {
 "s2_r1": [
   ("T", "Okay! First, take out your green exercise book.", 0.15, 0),
   ("T", "Sam! Stop kicking that chair!", 0.5, 3),
   ("K", SAM, "I wasn't even doing anything!", -0.45, -0.6),
   ("T", "Thank you. Your green exercise book, and write today's date at the top of a new page.", 0.3, 0),
 ],
 "s2_r2": [
   ("T", "Next! Grab a black pen, and underline all the verbs in the first paragraph.", 0.15, 0),
   ("T", "Mia! That's not yours. Give it back!", 0.5, 3),
   ("K", MIA, "But she took mine first!", -0.4, 0.6),
   ("T", "Oh, actually, no. Use a blue pen. Black is for corrections.", 0.35, 0),
   ("T", "Then swap books with the person on your left.", 0.3, 0),
 ],
 "s2_r3": [
   ("T", "Last thing! When the bell goes, put your worksheet in the tray by the door.", 0.15, 0),
   ("T", "Leo! Sit down! The bell hasn't gone yet!", 0.5, 3),
   ("K", LEO, "Aw, come on!", -0.35, 0.55),
   ("T", "Sorry! The tray on my desk, not by the door. Then stack your chair, and remind Sam about his permission slip.", 0.3, 0),
   ("T", "Sam! The window stays closed!", 0.4, 3),
   ("K", SAM, "But it's so hot in here!", -0.3, -0.6),
 ],
}

LECTURE = [
 "Good morning. Today's topic is soil drainage.",
 "Soil is made from three sizes of mineral particle. Sand, silt, and clay.",
 "Sand particles are the largest. Because the gaps between them are large, water drains through sand quickly.",
 "Clay particles are the smallest. They pack together tightly, so clay holds on to water, and drains very slowly.",
 "Silt sits in between.",
 "A soil that contains a balanced mix of all three is called loam. Loam is considered the best soil for most garden plants.",
 "You can estimate the make-up of your soil with a jar test.",
 "Half fill a jar with soil, top it up with water, shake it, and leave it for twenty-four hours.",
 "The sand settles at the bottom, the silt in the middle, and the clay on top.",
 "If your soil drains poorly, the recommended fix is to dig in organic matter, such as compost.",
 "A common mistake is adding sand to clay soil. In small amounts, this can make it set hard, rather like concrete.",
 "That concludes today's material on soil drainage.",
]

GOSSIP = [
 (GOSS1, "Oh my god. Did you hear about Jess and Tyler?"),
 (GOSS2, "No! What happened?"),
 (GOSS1, "She broke up with him! Because he's a donkey!"),
 (GOSS2, "Like, he was mean to her?"),
 (GOSS1, "No! Like, an actual donkey! Hooves and everything!"),
 (GOSS2, "Shut up!"),
 (GOSS1, "She found hay in his car! And he only ever ordered carrots!"),
 (GOSS2, "I thought he was just really into health stuff!"),
 (GOSS1, "When she asked him about it, he just went hee haw, and walked out!"),
 (GOSS2, "Oh my god! Is she okay?"),
 (GOSS1, "She's fine! She's going out with a guy from the rowing team now."),
 (GOSS2, "Is he normal?"),
 (GOSS1, "He's a horse. But he's really, really nice!"),
]

CHATTER_VOICES = [("af_bella","en-us"),("am_puck","en-us"),("bf_lily","en-gb"),("af_sky","en-us"),("am_liam","en-us"),("bf_alice","en-gb"),("am_echo","en-us"),("af_river","en-us")]
CHATTER_LINES = [
 "Did you watch it last night?", "Give it back!", "No way, that's so good!", "Can I borrow your charger?",
 "I'm literally starving!", "What are we even doing?", "Stop it, that tickles!", "Are you going on Saturday?",
 "That's mine, actually!", "He fell right off his chair!", "Wait, what?", "Look at this, look at this!",
 "Who's got a spare pen?", "She said what?", "Oh my gosh, stop!", "Is it lunch yet?", "Bro, that's crazy!",
 "I didn't do the homework!", "Can you move over?", "Ha! That's so funny!", "Shh, shh, she's looking!", "Pass it here!",
]
