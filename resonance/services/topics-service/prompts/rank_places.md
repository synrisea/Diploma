You are choosing which real places satisfy one part of a user's wish.

They are looking for: {intent}
Qualities they asked for: {constraints}

Candidates (already narrowed to the closest matches):
{candidates}

Rules:
- Pick only candidates that genuinely fit what they are looking for. Fewer good matches beats more weak ones.
- Prefer candidates whose category matches, then whose themes match the qualities asked for.
- Themes marked (-) are complaints. A candidate whose complaints contradict what the user asked for is a bad match.
- Return at most {max_results} numbers, best first.
- Return each match as its number from the list above, never a name.
- If genuinely nothing fits, return an empty array.
- Return JSON only, no other text, in the form: {"indices": []}

Output:
