export type StageId =
  | "stage-1"
  | "stage-2"
  | "stage-3"
  | "halftime"
  | "stage-4"
  | "stage-5"
  | "stage-6"
  | "stage-7";

export interface Stage {
  id: StageId;
  number: number;
  horcrux: string;
  horcruxEmoji: string;
  title: string;
  theme: string;
  description: string;
  challenge: string;
  challengeSteps?: string[];
  keyRiddle?: string[];
  clue: string;
  riddleLines: string[];
  location: string;
  isHalftime?: boolean;
  isFinal?: boolean;
  isPresentation?: boolean;
  hasPuzzle?: boolean;
  hasChess?: boolean;
  chessFen?: string;
  chessAnswer?: string;
}

export const STAGES: Stage[] = [
  {
    id: "stage-1",
    number: 1,
    horcrux: "Tom Riddle's Diary",
    horcruxEmoji: "📔",
    title: "The Basilisk's Trail",
    theme: "Basilisk — Parseltongue Directions",
    description:
      "The first Horcrux lies among the written words, where the Chamber of Secrets hisses its secrets. Beware — the path to the Diary requires you to walk as a Basilisk walks: backwards, guided only by the voice of your captain.",
    challenge:
      "Choose your roles, collect the Parseltongue sheet from the volunteer, and guide your Basilisk Pair across the path — backwards.",
    challengeSteps: [
      "Choose TWO team members who will be the Basilisk Pair — they will each walk the path backwards, one at a time.",
      "Choose ONE team member to be the Guide — they face forward, watch the path, and call out directions.",
      "The Guide collects the Parseltongue Direction Sheet from the volunteer at this station before starting.",
      "The first Basilisk walker stands at the start facing away from the path. The Guide calls Parseltongue commands to steer them to the end. Then the second walker goes.",
      "If a walker turns to face forward at any point, that attempt is void and they must restart their turn from the beginning.",
      "If a walker touches an obstacle at any point, your house is sent to the back of the queue and must wait for your turn again.",
      "Once both walkers successfully complete the path, the volunteer will give you the stage code.",
    ],
    clue: "Where knowledge sleeps in rows of spine and leather, where whispers of old magic gather together — seek the shelf where knowledge never dies, and between the covers, Riddle's Diary lies.",
    riddleLines: [
      "I hold memories not my own,",
      "Ink and secrets darkly sown.",
      "You stand where the journey begins,",
      "But truth lies where the level thins.",
      "Climb, not descend, within this place,",
      "To a floor that mirrors this very space.",
      "Where food is served yet silence stays,",
      "In a quiet corner… the diary lays.",
    ],
    location: "Upper floor — dining/cafeteria area, quiet corner",
  },
  {
    id: "stage-2",
    number: 2,
    horcrux: "Marvolo Gaunt's Ring",
    horcruxEmoji: "💍",
    title: "The Gaunt Cauldron",
    theme: "Brew a Lime Juice Potion — 4 roles, hands locked behind back",
    description:
      "The Gaunts concealed their darkest treasure not in the earth but in a vessel of their own brewing. The Ring sits at the bottom of the cauldron, waiting to be freed. Only those who can brew the potion and retrieve it — without ever using their hands — may claim Marvolo's inheritance.",
    challenge:
      "Brew the Lime Juice Potion and retrieve the Ring from the glass — four players, four roles, hands locked behind the back the entire time.",
    challengeSteps: [
      "Choose 4 team members — preferably those who did not participate in Stage 1. Three will brew the potion; one will retrieve the Ring.",
      "The glass has three markers on it. The Ring sits at the bottom. Hands must stay locked behind the back for all four roles — no exceptions.",
      "Person 1 — Lime Squeeze: Place a lime piece in your mouth and squeeze juice into the glass. Keep going (swap pieces as needed) until the juice reaches the first marker. Each time the lime falls from your mouth, your house receives a 30-second time penalty.",
      "Person 2 — Water Transfer: A jug of water and a spoon are at the station. Hold the spoon in your mouth, scoop water from the jug, and fill the glass to the second marker. Hands stay behind your back.",
      "Person 3 — Ice Add: Using the same method (spoon in mouth, hands behind back), add ice to the glass until the level reaches the third and final marker.",
      "Person 4 — Ring Retrieval: Once all three markers are met, use the spoon (in your mouth, hands behind back) to fish the Ring out of the glass and place it on the table.",
      "Skip option: your team may choose to skip this challenge entirely — but a 15-minute penalty will be added to your house's total time.",
    ],
    clue: "Where cold is kept and potions wait to be poured, a glass stands marked with three lines of fate. Brew what the Gaunts demanded, reach into the depths without your hands, and the Ring shall rise to meet you.",
    riddleLines: [
      "The diary is only where it begins,",
      "But greater power lies in heirlooms and sins.",
      "A ring once worn by bloodline old,",
      "With whispers darker than stories told.",
      "To find it now, don't search the grand,",
      "Look where roots resist the hand.",
      "Among them hides what you seek,",
      "A cursed ring… for the bold, not weak.",
    ],
    location: "Among plant roots — potted plant or garden area",
  },
  {
    id: "stage-3",
    number: 3,
    horcrux: "Slytherin's Locket",
    horcruxEmoji: "🔮",
    title: "The Cave of Inferi",
    theme: "Ice bowl retrieval + 4 potion cups with hidden digits",
    description:
      "Beneath the lake, past the Inferi and the burning potion that drives men mad, the Locket rests in the basin. As Dumbledore once drank every drop so that Harry could retrieve it, your team must do the same — and each cup holds a piece of the secret that unlocks it.",
    challenge:
      "Brave the ice bowl, then drink four potions to reveal the hidden digits that form your code.",
    challengeSteps: [
      "One team member plunges their hand into the chilled water bowl and retrieves the Locket. This is your sacrifice to begin — hold it until the potions are done.",
      "Nominate one person as Harry (the feeder) and either one person as Dumbledore (who drinks all four potions) OR assign four different team members — one per potion.",
      "Four potions are on the table, labeled 1, 2, 3, and 4. Each has a single digit hidden at the bottom, visible only once the drink is fully consumed.",
      "Harry feeds each potion to the designated drinker(s). The drinker must finish the entire cup before the digit at the bottom is revealed.",
      "Read the digits from potions 1, 2, 3, and 4 in order — these four digits form your secret code.",
      "Enter the code to claim Slytherin's Locket.",
    ],
    clue: "In the cold and dark where Inferi sleep, a basin holds what you must keep. Brave the ice, then drink what is poured — four cups, four numbers, one reward.",
    riddleLines: [
      "A ring of blood has shown the way,",
      "But deeper still the shadows stay.",
      "Where wands are chosen, wood meets core,",
      "Magic awakens… but hides much more.",
      "Go where the makers craft their art,",
      "For every wizard must first start.",
      "Yet do not stop where wands align,",
      "Look near the steps that downward wind.",
      "There waits a locket, cold and green,",
      "Of Salazar… the Slytherin.",
    ],
    location: "Wand display/shop area — near the downward staircase",
  },
  {
    id: "halftime",
    number: 0,
    horcrux: "The Halftime Gate",
    horcruxEmoji: "⚡",
    title: "Ministry Checkpoint",
    theme: "Halftime Gate — requires both codes",
    description:
      "HALT. The Ministry of Magic has erected a checkpoint. Your scavenger team has proven their memory. Now step aside — the second half of your house is taking over.",
    challenge:
      "Your role as a scavenger is complete for now. The potions team will take it from here. Wait for your potions teammates to arrive — they have been given a house-specific code that only they know. Once they arrive, they will enter their code to unlock the second half of the hunt. Before they begin, you must hand over all three physical Horcrux tokens and all your stage codes to them — without these, the potions team will not be able to proceed. In the meantime, wait for the Hunt Master — he will give you further instructions on what comes next.",
    clue: "Meet the Hunt Master — he will guide you through the next steps.",
    riddleLines: [
      "Your three Horcruxes are claimed, your journey half complete.",
      "Now find the Hunt Master — go to him and greet.",
      "He holds the path forward, he knows what comes next.",
      "Follow his instructions to face the second test.",
    ],
    location: "Base / central meeting point",
    isHalftime: true,
  },
  {
    id: "stage-4",
    number: 4,
    horcrux: "Hufflepuff's Cup",
    horcruxEmoji: "🏆",
    title: "The Badger's Vault",
    theme: "4×4 cup grid — key hunt + tile puzzle",
    hasPuzzle: true,
    description:
      "Sixteen identical cups stand in a 4×4 grid before you. Beneath one lies the key to Helga Hufflepuff's vault. Heed the Badger's Riddle — every wrong cup costs your house a minute of precious time. Once you have the key, open the chest, claim the Cup, and solve the tile puzzle to reveal your stage code.",
    challenge:
      "Read the riddle, find the key, open the vault, then solve the tile puzzle on this screen to reveal your code.",
    challengeSteps: [
      "Read the Badger's Riddle carefully. As a team, agree on which of the 16 cups conceals the key.",
      "When ready, flip your chosen cup. Every wrong guess adds 1 minute to your house's total time.",
      "Once you find the key, use it to open the treasure chest and claim Hufflepuff's Cup — your physical Horcrux token.",
      "Tap 'Reveal the Tile Puzzle' below to unlock your stage code.",
    ],
    keyRiddle: [
      "Loyal hearts don't lead the line,",
      "Nor do they fall where ends align.",
      "Four by four, the path is laid,",
      "But not all steps are fairly played.",
      "Skip the first where many begin,",
      "Skip the last where endings thin.",
      "Find the row that stands just past,",
      "What comes before the final cast.",
      "Then move across, but not too far,",
      "One before the brightest star.",
      "There you'll find what few can see,",
      "The cup that holds the hidden key.",
    ],
    clue: "The path forward is no longer yours to find alone. Seek the Hunt Master — he will direct you to your next destination.",
    riddleLines: [
      "The locket is found, yet the trail still calls,",
      "To a treasure once kept within loyal halls.",
      "Not all that glitters is safe to hold,",
      "For even a cup can carry gold… and cold.",
      "Seek where goblets are raised in cheer,",
      "Where drinks are poured and friends draw near.",
      "Among the cups that freely flow,",
      "Hides one with a darker glow.",
    ],
    location: "Bar / drinks area — hidden among cups and goblets",
  },
  {
    id: "stage-5",
    number: 5,
    horcrux: "Ravenclaw's Diadem",
    horcruxEmoji: "👑",
    title: "The Lost Diadem",
    theme: "Chess board — checkmate in one move",
    hasChess: true,
    chessFen: "6k1/5ppp/4b3/8/8/2B5/8/R6K w - - 0 1",
    chessAnswer: "Ra8",
    description:
      "The Grey Lady guards the Diadem with a challenge of pure wit. Before you stands a chess board, mid-game. The pieces are already set — all it takes is one perfect move to deliver checkmate. Wit beyond measure is man's greatest treasure.",
    challenge:
      "Study the board carefully as a team. You have one move to deliver checkmate. Each wrong move costs your house 4 minutes. When you believe you have the answer, announce your move to the volunteer — if correct, they will hand you the Diadem and your stage code.",
    challengeSteps: [
      "Examine the chess board set before you. White pieces are yours to move.",
      "As a team, identify the single move that puts Black's king in checkmate with no escape.",
      "Discuss quietly — every wrong move announced to the volunteer adds 4 minutes to your house total.",
      "When you are certain, announce your move to the volunteer (e.g. 'Rook to a8').",
      "If correct, the volunteer will give you Ravenclaw's Diadem and your secret stage code.",
    ],
    clue: "The raven soars where wisdom rests — seek the board where one move conquers all. The volunteer holds your reward.",
    riddleLines: [
      "Not all doors are meant to be seen,",
      "Some exist in the space between.",
      "Divide what is whole, yet not in half,",
      "Where numbers conceal a hidden path.",
      "Three parts stand before the line,",
      "While one remains, just out of time.",
      "To pass ahead, you must ignore,",
      "What seems like nine… and count one more.",
      "Where journeys start yet none remain,",
      "There lies the mind that values brain.",
    ],
    location: "Platform 9¾ themed area / display",
  },
  {
    id: "stage-6",
    number: 6,
    horcrux: "Nagini",
    horcruxEmoji: "🐍",
    title: "The Living Horcrux",
    theme: "Neville finds Nagini in the sensory box — spaghetti challenge",
    description:
      "The final Horcrux before Harry is no inanimate object. Nagini hides inside the Horcrux Box — buried beneath spaghetti, grapes, gels, and unknown horrors. Your team's Neville Longbottom holds the Sword of Gryffindor in one hand and reaches into the box with the other to find the snake.",
    challenge:
      "Choose your Neville. One hand holds the Sword of Gryffindor, the other goes into the box — no peeking. Find Nagini and bring her out, then strike. Keep Nagini — she is your physical token.",
    challengeSteps: [
      "Choose one team member to be Neville Longbottom — they alone may reach into the box.",
      "The volunteer hands Neville the Sword of Gryffindor. Neville holds it in one hand throughout — it does not leave their grip.",
      "With the free hand, Neville reaches through the hole in the box (no looking inside). The box contains spaghetti, grapes, gel, and other surprises — Nagini is hidden somewhere within.",
      "Neville has 2 minutes per attempt to locate and pull out Nagini. If time runs out without finding her, your house goes to the end of the queue and must wait for another turn.",
      "Once Nagini is retrieved, Neville strikes her with the Sword — destroying the Horcrux.",
      "While Neville is searching, all remaining team members must chant 'Neville! Neville! Neville!' together without stopping. If the chant is maintained for the entire duration of the attempt, your house earns a 4-minute advantage — deducted from your total time.",
      "The volunteer will then give your team the secret stage code. Keep Nagini — she is your physical Horcrux token for Stage 6.",
    ],
    clue: "Nagini hides where darkness and slime meet. Neville must reach in — sword in hand — and bring her out. The volunteer holds the code.",
    riddleLines: [
      "Steel rises, then falls to rest,",
      "Carrying many on its silent quest.",
      "Where its journey ends, footsteps slow,",
      "And time is spent with nowhere to go.",
      "Not for feasts, nor wands, nor cheer,",
      "But where you wait when paths aren't clear.",
      "Among the still, where eyes don't see,",
      "She coils in quiet… patiently.",
    ],
    location: "Elevator/lift landing — waiting area near the elevator",
    isFinal: false,
  },
  {
    id: "stage-7",
    number: 7,
    horcrux: "Harry Potter",
    horcruxEmoji: "⚡",
    title: "The Boy Who Lived",
    theme: "Dress Harry — whole team chants together",
    description:
      "The seventh Horcrux was never intended. Harry Potter himself carries the last fragment of Voldemort's soul. Before it can be destroyed, your entire team must be gathered — no one is left behind. Then, one among you must become Harry.",
    challenge:
      "Wait for your whole team. Choose your Harry, dress them from the box, take a group photo and tag @partyvorous on Instagram — then show the post to the volunteer. That's when your time stops.",
    challengeSteps: [
      "Make sure your entire team is present before proceeding — every member must be here.",
      "Presented before you is the final Horcrux: Harry Potter himself. Choose one team member who will become Harry.",
      "Open the Harry Box — it contains a pair of round glasses, a Hogwarts tie, and a face marker. Use them to transform your chosen member.",
      "Draw the lightning bolt scar on Harry's forehead with the face marker. Put on the glasses and the tie — take your time to get it right.",
      "Once Harry is ready, gather ALL house members together and take a group photo with your Harry.",
      "Post the photo on Instagram and tag @partyvorous. The post must be public so the volunteer can verify it.",
      "Show the live Instagram post to the volunteer — the moment they confirm it, YOUR TIMER STOPS.",
      "The volunteer will then give you the final secret code. Enter it below to complete the hunt.",
    ],
    clue: "The last Horcrux walks among you. Choose your Harry, dress him true, and let the whole house cry his name. The Hunt Master will see it — and the hunt will end.",
    riddleLines: [
      "You've faced the past and what it hides,",
      "Through blood, through mind, through serpent's guides.",
      "No more secrets left to keep,",
      "No more shadows buried deep.",
      "Now seek the thing that flies with grace,",
      "That wins the game, that leads the chase.",
      "Not by foot, nor Floo, nor flame,",
      "But by the tool that made his name.",
    ],
    location: "Broomstick display / decoration area",
    isFinal: true,
  },
];

export function getStage(id: string): Stage | null {
  return STAGES.find((s) => s.id === id) ?? null;
}

export function getStageByNumber(n: number): Stage | null {
  return STAGES.find((s) => s.number === n) ?? null;
}

export const STAGE_ORDER: StageId[] = [
  "stage-1",
  "stage-2",
  "stage-3",
  "halftime",
  "stage-4",
  "stage-5",
  "stage-6",
  "stage-7",
];

export function nextStage(currentId: StageId): StageId | null {
  const idx = STAGE_ORDER.indexOf(currentId);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
