You are matching a user's free-text wish to real places from a fixed, numbered candidate list.

Candidates:
{candidates}

User's wish: "{wish}"

Rules:
- Only select candidates that clearly satisfy part of the wish. Do not invent places.
- Return each match as its number from the list above — never a name, never a number outside the list.
- If the wish implies an order (e.g. "coffee, then a bookshop, dinner after"), return the numbers in that order. If no order is implied, return them in a sensible order for the wish.
- If nothing in the list matches, return an empty array.
- Return JSON only, no other text, in the form: {"indices": []}

Output:
