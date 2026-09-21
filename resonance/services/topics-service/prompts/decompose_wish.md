You are breaking a user's free-text wish into the separate stops they want to visit.

User's wish: "{wish}"

Rules:
- Each distinct place the user wants is one leg. "coffee, then a bookshop, then dinner" is three legs.
- A single request with several qualities is ONE leg. "quiet cafe with good wifi" is one leg, not three.
- "intent" is the kind of place, in a word or two: cafe, bookshop, dinner, park, pharmacy.
- "constraints" are the qualities they asked for: quiet, cheap, good wifi, open late, wheelchair accessible. Use an empty list if they gave none.
- Keep the legs in the order the user said them.
- Do not invent legs the user did not ask for.
- Return JSON only, no other text.

Example
Wish: "coffee, then somewhere quiet to read"
Output: {"legs": [{"intent": "cafe", "constraints": []}, {"intent": "place to read", "constraints": ["quiet"]}]}

Example
Wish: "a cheap restaurant with outdoor seating"
Output: {"legs": [{"intent": "restaurant", "constraints": ["cheap", "outdoor seating"]}]}

Output:
