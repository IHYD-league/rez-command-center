/**
 * Summer Quest shared curriculum.
 *
 * Single source of truth for both arms:
 *   - Kid arm   (src/SummerQuest.jsx)        — gem map, weekly quests
 *   - Parent arm (src/summerQuest/ParentCompanion.jsx) — Coach Mode
 *
 * Per the v2 brief: WEEKS + THREADS were duplicated in both files and
 * marked `// SHARED`. They live here now. Parent-only content (GUIDE,
 * MATH generators) stays in ParentCompanion.jsx — not curriculum, just
 * teacher cliffnotes + live number generators.
 *
 * Canonical text matches the kid arm's pre-existing wording (the fuller
 * version Reznor was already seeing). The parent arm renders the same
 * strings; if Coach Mode wants abbreviated previews, it can trim at
 * render time rather than maintain a second copy.
 */

export const THREADS = [
  { k: "build", cls: "b", emoji: "🎨", home: "Make & Build", car: "Dream & Design" },
  { k: "math",  cls: "m", emoji: "🔢", home: "Lego Math",    car: "Travel Math" },
  { k: "code",  cls: "c", emoji: "🤖", home: "Coding",        car: "Coding on the Go" },
  { k: "read",  cls: "r", emoji: "📚", home: "Reading",       car: "Reading & Listening" },
];

export const WEEKS = [
  { n: 1, name: "Inventors' Workshop", tag: "Just dream and make.",
    build: { home: "Dream up your game! Pick the theme and paint the board and cards.",
             car: "Dream Designer — invent your game out loud. Name it, describe the heroes and the board." },
    math:  { home: "Lego part-whole: “You have 12 bricks, give me 5 — show me what’s left.”",
             car: "Snack Math — “You have 10 goldfish, eat 3. How many left?”" },
    code:  { home: "The Sandwich Robot — give exact steps; the grown-up follows them TOO literally!",
             car: "Robot Driver — give turn-by-turn directions to a make-believe place; the driver follows EXACTLY. Fix the bugs!" },
    read:  { home: "Pick your summer book. Draw one comic panel of your favorite moment.",
             car: "Audiobook Adventure — start your summer book as an audiobook (or read the road signs!)." } },

  { n: 2, name: "The Rulebook", tag: "Turn the idea into a real game.",
    build: { home: "Write the rules together and choose your Lego playing pieces.",
             car: "Rule Maker — say your game’s rules out loud, one by one. Mom writes them down." },
    math:  { home: "Roll dice 20 times and tally — which number wins?",
             car: "Car Counter — tally red cars vs blue cars for 5 minutes. Which won, and by how many?" },
    code:  { home: "Arrow mazes — program a path (up, up, right) for a grown-up to walk.",
             car: "Finger Maze — “left, left, right, straight” — guide a grown-up’s finger through a pretend maze." },
    read:  { home: "Spanish day — read in Spanish and draw a panel in Spanish.",
             car: "Spanish Spotting — name 5 things out the window in Spanish (or play Spanish songs / audiobook)." } },

  { n: 3, name: "Playtest & Fix", tag: "Version 1 is never the final version.",
    build: { home: "Play your game with the family. Find what’s boring and make Version 2!",
             car: "Fix-It Talk — what’s the most boring part of your game? How would you make it more fun?" },
    math:  { home: "Stack each player’s points in bricks — who has more, by how many?",
             car: "Who’s Winning? — keep score in a road-trip game. Who has more points, and by how many?" },
    code:  { home: "Find the Bug — spot the silly mistake in the grown-up’s instructions.",
             car: "Find the Bug — a grown-up gives silly directions (“put on shoes to get a snack”). What’s wrong?" },
    read:  { home: "Read together and guess: what happens next, and why?",
             car: "Story Predict — pause the audiobook: what happens next, and why?" } },

  { n: 4, name: "Hello, Screen", tag: "Take the paper game digital.",
    build: { home: "Open ScratchJr and make a character move!",
             car: "Screen Sketch — ScratchJr at a rest stop, or draw your hero in the travel notebook." },
    math:  { home: "Groups of — build 3 piles of 4 bricks. How many total?",
             car: "Groups Game — “4 wheels on each car, 3 cars — how many wheels?”" },
    code:  { home: "ScratchJr basics — make a sprite move and react to a tap.",
             car: "Tap Story — plan out loud: when you tap your hero, what happens? Say the steps." },
    read:  { home: "Make your own one-page comic, Cat Kid style.",
             car: "Comic in Your Head — invent a one-page comic and tell it panel by panel." } },

  { n: 5, name: "Make It Move", tag: "Add interaction. Make it feel real.",
    build: { home: "Add a second character in ScratchJr — make them talk!",
             car: "Two-Hero Tale — invent a second character. What do they say to each other?" },
    math:  { home: "Build a tower EXACTLY 10 bricks. Now one 3 taller.",
             car: "Guess the Distance — “how many minutes to the next sign?” Then check. Were you close?" },
    code:  { home: "Loops! Make something repeat. Peek at big-kid Scratch if you’re flying.",
             car: "Repeat Game — clap a pattern (clap-clap-stomp) and LOOP it 3 times. That’s a loop!" },
    read:  { home: "Label your game in English AND Spanish.",
             car: "Both Languages — name 5 road things in English AND Spanish." } },

  { n: 6, name: "Director's Chair", tag: "Your pick. Curiosity leads.",
    build: { home: "YOUR pick — go big on art, code, Lego, or a stop-motion movie.",
             car: "You Pick — what do you most want to dream up right now? You lead!" },
    math:  { home: "Cooking fractions or a pretend store with coins — you choose!",
             car: "Money Math — you’ve got $5 at the snack shop. What can you buy?" },
    code:  { home: "Finish one small game, start to end — your own idea.",
             car: "Teach Back — explain to Mom how a robot would do something, step by step." },
    read:  { home: "Flip it — YOU read to the grown-ups today.",
             car: "Read Aloud — read a sign, a menu, or a page to the whole car." } },

  { n: 7, name: "Showcase & Ship", tag: "You hold the thing you dreamed up.",
    build: { home: "Family game night with YOUR game — you teach the rules!",
             car: "Big Pitch — give the 30-second pitch for your game like a real inventor!" },
    math:  { home: "You’re the official scorekeeper tonight.",
             car: "Scorekeeper — you run the points for the whole car-game tournament." },
    code:  { home: "Show off what you built. What would Version 3 be?",
             car: "Version 3 — what’s the NEXT awesome thing you’d add? Dream big." },
    read:  { home: "Finish your book and pick the next adventure.",
             car: "Next Adventure — pick the book or audiobook for the drive home." } },
];
