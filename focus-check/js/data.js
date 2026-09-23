const STAGES = [
  {title:"What did the teacher say?", text:"Your English teacher is reading a story, but the class won't stop talking. Listen closely. Questions come after each part.", button:"Start stage 1"},
  {title:"Hang on, what was I doing?", text:"Your teacher gives you instructions at your desk, but keeps getting interrupted. After each one, tap the steps she asked you to do, in order.", button:"Start stage 2"},
  {title:"The world's most boring lecture", text:"Take notes while the lecturer talks. Not everyone around you is paying attention. Afterwards, write a short summary for AI to mark.", button:"Start stage 3"}
];

const STORY_QUESTIONS = [
  [ {q:"How many steps did Agnes climb each night?", options:["112","120","102","212"]},
    {q:"What was the cat called?", options:["Biscuit","Ginger","Muffin","Pickle"]} ],
  [ {q:"Why wouldn't the lamp light?", options:["The cat spilled tea on the matches","The bulb had burned out","The wind blew the flame out","The power had gone off"]},
    {q:"What was the boat called?", options:["The Silver Gull","The Grey Gull","The Silver Star","The Sea Swallow"]} ],
  [ {q:"What did the captain bring?", options:["Dry matches and a small fish","A new lamp and a fish","Flowers and a box of tea","A tin and a warm blanket"]},
    {q:"Where are the matches kept now?", options:["In a tin","In Agnes's pocket","Next to the lamp","In the kitchen drawer"]} ]
]; // first option is always the correct one; options are shuffled on screen

const ROUNDS = [
  { clip:"s2_r1", steps:["Take out your green exercise book","Write today's date at the top of a new page"],
    superseded:[], distractors:["Take out your red exercise book","Stop kicking the chair","Write your name at the top","Turn to the last page"] },
  { clip:"s2_r2", steps:["Grab a blue pen","Underline the verbs in the first paragraph","Swap books with the person on your left"],
    superseded:["Grab a black pen"], distractors:["Underline the nouns in the first paragraph","Give the pen back to Mia","Swap books with the person on your right"] },
  { clip:"s2_r3", steps:["Put your worksheet in the tray on her desk","Stack your chair","Remind Sam about his permission slip","Take the register back to the office"],
    superseded:["Put your worksheet in the tray by the door"], distractors:["Sit down","Close the window","Stack all the chairs"] },
  { clip:"s2_r4", steps:["Take the sports gear out of the cupboard","Count out twenty cones","Put them in the blue bag","Sign the equipment sheet","Meet her on the field at ten past"],
    superseded:["Count out twelve cones"], distractors:["Put your phone in the box","Put them in the red bag","Meet her in the gym"] }
];
const TOTAL_STEPS = ROUNDS.reduce((n, r) => n + r.steps.length, 0);


const STAGE_TEXT_SIMPLE = [
  { title:"What did the teacher say?", text:"Your teacher is reading a story, but the class keeps talking. Listen carefully. Questions come after each part.", button:"Start stage 1" },
  { title:"What did she ask you to do?", text:"Your teacher asks you to do some jobs, but people keep interrupting her. Then tap the jobs in the right order.", button:"Start stage 2" }
];
const STAGE3_ASSEMBLY = { title:"The longest assembly ever", text:"The principal is talking about the school trip, and the kids near you are not listening. Tap every time you hear one special word, then answer a few questions.", button:"Start stage 3" };
function stageInfo(i){
  if (i === 2 && CFG.stage3 === "assembly") return STAGE3_ASSEMBLY;
  if (CFG.story === "simple" && STAGE_TEXT_SIMPLE[i]) return STAGE_TEXT_SIMPLE[i];
  return STAGES[i];
}

/* ---- age bands: each one sets how hard the three stages are ---- */
const SIMPLE_ROUNDS = [
  { clip:"k2_r1", steps:["Put the red book on the shelf","Get your lunchbox"],
    superseded:[], distractors:["Put the blue book on the shelf","Sit down","Get your coat","Put the book in your bag"] },
  { clip:"k2_r2", steps:["Get the green crayons","Draw a big sun","Wash your hands"],
    superseded:["Get the blue crayons"], distractors:["Draw a big moon","Dry your hands","Get the paints"] }
];

const SIMPLE_STORY_QUESTIONS = [
  [ {q:"How many steps did Agnes climb?", options:["112","120","102","212"]},
    {q:"What was the cat called?", options:["Biscuit","Ginger","Muffin","Pickle"]} ],
  [ {q:"Why would the lamp not light?", options:["The cat spilled tea on the matches","The wind blew it out","The light bulb broke","There was no power"]},
    {q:"What was the boat called?", options:["The Silver Gull","The Grey Gull","The Silver Star","The Sea Swallow"]} ],
  [ {q:"What did the captain bring?", options:["Dry matches and a fish","A new lamp and a fish","Flowers and some tea","A tin and a blanket"]},
    {q:"Where do the matches live now?", options:["In a tin","In her pocket","Next to the lamp","In the kitchen"]} ]
];

const ASSEMBLY = {
  word:"zoo",
  questions:[
    {q:"Where is the trip to?", options:["The zoo","The beach","The museum","The farm"]},
    {q:"What do you need to bring?", options:["Lunch, raincoat and water","Money for the shop","Toys from home","A swimming towel"]},
    {q:"What day is the trip?", options:["Friday","Monday","Wednesday","Sunday"]}
  ],
  probe:{q:"The kids next to you were whispering. What was in the field?", options:["A horse","A dog","A cow","A dragon"]}
};

const AGE_BANDS = [
  { min:5,  max:7,   label:"5 to 7",   noise:[0.05,0.10,0.18], qTime:22, rounds:"simple1", stepTime:[40],             stage3:"assembly", tapWindow:2.0, aqTime:20, story:"simple" },
  { min:8,  max:9,   label:"8 to 9",   noise:[0.06,0.14,0.25], qTime:20, rounds:"simple2", stepTime:[40,46],          stage3:"assembly", tapWindow:1.8, aqTime:18, story:"simple" },
  { min:10, max:12,  label:"10 to 12", noise:[0.08,0.20,0.34], qTime:17, rounds:"std2",    stepTime:[34,40],          stage3:"assembly", tapWindow:1.6, aqTime:16, story:"standard" },
  { min:13, max:15,  label:"13 to 15", noise:[0.09,0.24,0.44], qTime:14, rounds:"std3",    stepTime:[32,38,46],       stage3:"lecture",  summary:45, story:"standard" },
  { min:16, max:18,  label:"16 to 18", noise:[0.10,0.28,0.52], qTime:12, rounds:"std4",    stepTime:[30,36,44,52],    stage3:"lecture",  summary:40, story:"standard" },
  { min:19, max:120, label:"adults",   noise:[0.12,0.32,0.62], qTime:12, rounds:"std4",    stepTime:[28,34,42,50],    stage3:"lecture",  summary:40, story:"standard" }
];
function bandFor(age){ return AGE_BANDS.find(b => age >= b.min && age <= b.max) || AGE_BANDS[AGE_BANDS.length-1]; }
function roundsFor(band){
  return { simple1:[SIMPLE_ROUNDS[0]], simple2:SIMPLE_ROUNDS, std2:ROUNDS.slice(0,2), std3:ROUNDS.slice(0,3), std4:ROUNDS }[band.rounds];
}
function questionsFor(band){ return band.story === "simple" ? SIMPLE_STORY_QUESTIONS : STORY_QUESTIONS; }

const GOSSIP_QUESTION = {q:"Pop quiz: what did Jess find in Tyler's car?", options:["Hay","Carrots","A saddle","A rowing oar"]};

const LECTURE_TEXT = "Good morning. Today's topic is soil drainage. Soil is made from three sizes of mineral particle. Sand, silt, and clay. Sand particles are the largest. Because the gaps between them are large, water drains through sand quickly. Clay particles are the smallest. They pack together tightly, so clay holds on to water, and drains very slowly. Silt sits in between. A soil that contains a balanced mix of all three is called loam. Loam is considered the best soil for most garden plants. You can estimate the make-up of your soil with a jar test. Half fill a jar with soil, top it up with water, shake it, and leave it for twenty-four hours. The sand settles at the bottom, the silt in the middle, and the clay on top. If your soil drains poorly, the recommended fix is to dig in organic matter, such as compost. A common mistake is adding sand to clay soil. In small amounts, this can make it set hard, rather like concrete. That concludes today's material on soil drainage.";

const KEY_POINTS = [
  {id:"K1", point:"Soil is made of three particle sizes: sand, silt and clay.", short:"The three particle sizes: sand, silt and clay"},
  {id:"K2", point:"Sand particles are the largest, with big gaps, so water drains through sand quickly.", short:"Sand is the largest and drains quickly"},
  {id:"K3", point:"Clay particles are the smallest and pack tightly, so clay holds water and drains slowly.", short:"Clay is the smallest, holds water and drains slowly"},
  {id:"K4", point:"Loam is a balanced mix of all three and is the best soil for most garden plants.", short:"Loam is a balanced mix and best for most plants"},
  {id:"K5", point:"Jar test: shake soil in a jar of water and leave it 24 hours; sand settles at the bottom, silt in the middle, clay on top.", short:"The jar test and its layers after 24 hours"},
  {id:"K6", point:"Fix poor drainage by digging in organic matter such as compost; adding sand to clay can make it set hard like concrete.", short:"Fix drainage with compost, not by adding sand to clay"}
];

const KID_WHISPER_WORDS = ["psst","a horse?","no way","really?","look!","shh","in the field?","wow"];
const CHATTER_WORDS = ["blah blah","lol","no way","wait what","haha","omg","bro","stop it","same","that's mine","?!","shh","huh?","ha!"];
const WHISPER_WORDS = ["psst","did you hear?","no way","a donkey?!","stop","hooves??","omg","wait…","shh","horse??"];
