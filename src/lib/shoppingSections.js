// Auto-classifier for shopping list items. Keyword-based, no API
// calls — runs instantly the moment Krissie taps Add. Per the doc's
// v2 phase, sections (Produce / Dairy / Pantry / etc.) make a single
// store run faster because you don't backtrack.
//
// The lists below are intentionally short — common-case household
// staples. Anything that doesn't match falls into "Other" and the
// parent can manually pick a section from the edit sheet. Over time
// we can grow the maps via Claude-suggested classifications when the
// vision API is in place.

export const SECTION_ORDER = [
  "Produce",
  "Dairy",
  "Meat & Seafood",
  "Bakery",
  "Frozen",
  "Pantry",
  "Snacks",
  "Beverages",
  "Household",
  "Personal",
  "Baby",
  "Other",
];

export const SECTION_EMOJI = {
  "Produce":         "🥬",
  "Dairy":           "🥛",
  "Meat & Seafood":  "🍗",
  "Bakery":          "🍞",
  "Frozen":          "🧊",
  "Pantry":          "🥫",
  "Snacks":          "🍪",
  "Beverages":       "🥤",
  "Household":       "🧻",
  "Personal":        "🧴",
  "Baby":            "🍼",
  "Other":           "🛒",
};

const SECTION_KEYWORDS = {
  "Produce": ["apple","apples","banana","bananas","grape","grapes","strawberry","strawberries","blueberry","blueberries","raspberry","raspberries","blackberry","pear","peach","plum","orange","oranges","lemon","lemons","lime","limes","cherry","cherries","melon","watermelon","cantaloupe","honeydew","pineapple","mango","avocado","avocados","kiwi","papaya","apricot","fig","date","coconut","tomato","tomatoes","onion","onions","garlic","ginger","potato","potatoes","sweet potato","yam","carrot","carrots","celery","lettuce","spinach","kale","arugula","romaine","cabbage","broccoli","cauliflower","brussels sprouts","asparagus","cucumber","cucumbers","zucchini","squash","pumpkin","bell pepper","pepper","peppers","jalapeno","mushroom","mushrooms","corn","peas","green bean","green beans","beet","beets","radish","leek","scallion","scallions","cilantro","parsley","basil","mint","rosemary","thyme","sage","dill","chive","chives","salad","greens","veggie","veggies","vegetable","vegetables","fruit","produce"],
  "Dairy": ["milk","whole milk","skim milk","almond milk","oat milk","soy milk","cream","heavy cream","half and half","sour cream","cream cheese","cheese","cheddar","mozzarella","parmesan","feta","brie","yogurt","greek yogurt","butter","margarine","ghee","egg","eggs","cottage cheese","ricotta","kefir"],
  "Meat & Seafood": ["chicken","chicken breast","chicken thigh","wings","ground beef","ground turkey","steak","ribeye","sirloin","beef","pork","pork chop","bacon","sausage","hot dog","hot dogs","turkey","ham","deli meat","salami","pepperoni","lamb","veal","fish","salmon","tuna","cod","tilapia","shrimp","scallop","crab","lobster","mussel","clam","oyster","sardine"],
  "Bakery": ["bread","sourdough","baguette","bagel","bagels","english muffin","muffin","muffins","roll","rolls","tortilla","tortillas","pita","croissant","pastry","donut","donuts","cake","cupcake","scone","pie crust","brioche"],
  "Frozen": ["frozen","ice cream","frozen pizza","frozen veggies","frozen vegetables","frozen fruit","frozen waffle","frozen meal","popsicle","popsicles","sorbet","gelato","frozen yogurt","frozen burrito","frozen fries","frozen chicken nuggets"],
  "Pantry": ["pasta","spaghetti","penne","rotini","macaroni","noodle","noodles","rice","brown rice","white rice","quinoa","oat","oats","oatmeal","cereal","granola","flour","sugar","brown sugar","powdered sugar","baking soda","baking powder","yeast","vanilla","cocoa","chocolate chip","bean","beans","black beans","kidney beans","pinto beans","chickpea","chickpeas","lentil","lentils","soup","broth","stock","sauce","tomato sauce","marinara","pasta sauce","salsa","ketchup","mustard","mayo","mayonnaise","vinegar","balsamic","olive oil","vegetable oil","canola oil","coconut oil","soy sauce","worcestershire","hot sauce","honey","jam","jelly","peanut butter","almond butter","nutella","syrup","maple syrup","salt","pepper","cinnamon","paprika","cumin","oregano","spice","spices","cracker","crackers","tortilla chip","tortilla chips","canned","tuna can"],
  "Snacks": ["chip","chips","pretzel","pretzels","popcorn","candy","chocolate","gum","cookie","cookies","granola bar","fruit snack","goldfish","trail mix","cereal bar","oreos"],
  "Beverages": ["water","sparkling water","seltzer","juice","orange juice","apple juice","cranberry juice","grape juice","lemonade","soda","coke","pepsi","sprite","root beer","tea","green tea","iced tea","coffee","coffee beans","ground coffee","energy drink","gatorade","sports drink","kombucha","wine","beer","spirit","whisky","vodka","gin","rum","tequila"],
  "Household": ["paper towel","paper towels","toilet paper","tissue","tissues","trash bag","trash bags","garbage bag","ziploc","ziplock","foil","plastic wrap","saran wrap","parchment","wax paper","paper plate","paper cup","napkin","napkins","dish soap","dishwasher pod","detergent","laundry detergent","fabric softener","dryer sheet","bleach","cleaner","disinfectant","sponge","sponges","scrubber","broom","mop","vacuum bag","battery","batteries","light bulb","light bulbs","aluminum foil"],
  "Personal": ["shampoo","conditioner","body wash","soap","bar soap","hand soap","toothpaste","toothbrush","mouthwash","floss","deodorant","razor","shaving cream","lotion","sunscreen","chapstick","lip balm","vitamin","vitamins","multivitamin","ibuprofen","tylenol","advil","aspirin","cold medicine","cough drop","bandaid","band aid","bandage","first aid","tampon","pad","pads","contact solution","makeup"],
  "Baby": ["diaper","diapers","wipe","wipes","baby food","formula","baby shampoo","baby lotion","baby wash","binky","pacifier","bottle","sippy cup"],
};

// Pre-built lowercase keyword → section map for fast lookup.
const KEYWORD_INDEX = (() => {
  const idx = new Map();
  for (const [section, words] of Object.entries(SECTION_KEYWORDS)) {
    for (const w of words) idx.set(w.toLowerCase(), section);
  }
  return idx;
})();

export function classifyItem(title) {
  if (!title) return "Other";
  const t = title.toLowerCase().trim();
  // Exact match (handles single-word items like "milk", "bread")
  if (KEYWORD_INDEX.has(t)) return KEYWORD_INDEX.get(t);
  // Token-by-token scan (handles "ground beef", "frozen pizza", "honey nut cheerios")
  const tokens = t.split(/[\s,\-/]+/).filter(Boolean);
  // Try longest-substring match first ("ground beef" → Meat) before
  // falling back to single-word ("beef" → Meat).
  for (let len = Math.min(4, tokens.length); len >= 1; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      const phrase = tokens.slice(i, i + len).join(" ");
      if (KEYWORD_INDEX.has(phrase)) return KEYWORD_INDEX.get(phrase);
    }
  }
  return "Other";
}
