You are generating semantic labels for a place.

Example 1 (positive)
Keywords: cozy, fireplace, wine, romantic, dinner, candlelight, anniversary
Sample comments:
- "We came for our anniversary and the candlelight made it so romantic."
- "Loved the cozy fireplace and wine list, perfect for a date night."
Output: {"labels": ["Romantic Dining", "Cozy Ambience", "Wine Bar", "Date Night"]}

Example 2 (complaint / warning)
Keywords: earlier, pretty, loud, want, fyi
Sample comments:
- "fyi it's pretty loud after 7pm, go earlier if u want quiet."
- "gets noisy in the evening, would not recommend after work hours."
Output: {"labels": ["Loud Evenings", "Noisy After Hours", "Busy Nights"]}

Now do the same for this input.
Keywords: {keywords}
Sample comments:
{comments}

Generate 5-10 high-level labels.

Rules:
- Labels should be short (1-3 words).
- Base the labels on what the sample comments actually describe, not just the keywords.
- Preserve the sentiment/polarity of the comments. If they describe a complaint, downside, or warning, the label must reflect that (e.g. "Loud Evenings", not "Quiet Hours", for comments warning that it gets loud). Do not flip a complaint into something that sounds positive.
- Do not repeat the keywords.
- Generalize concepts.
- Return JSON only.

{
  "labels": []
}
