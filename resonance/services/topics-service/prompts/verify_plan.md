You are checking a proposed shortlist against what the user actually asked for, and correcting it.

They are looking for: {intent}
Qualities they asked for: {constraints}

Currently selected:
{selected}

All available candidates:
{candidates}

Rules:
- For each selected place, decide whether it genuinely fits. Drop the ones that do not.
- If nothing selected fits but something else in the candidate list does, pick that instead.
- Do not keep a place just because it was already selected.
- Return at most {max_results} numbers, best first, using the numbers from the candidate list.
- If genuinely nothing in the candidate list fits, return an empty array.
- Return JSON only, no other text, in the form: {"indices": []}

Output:
