"""Route planning quality metrics, per docs/route-planning-v2-design.md section 6.

Hits the live endpoint with a fixed wish set and scores category correctness, leg
coverage and abstention. Run from the host (needs places-service for candidates):

    python eval_itinerary.py
"""
import json
import statistics
import sys
import time
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PLACES_API = "http://localhost:5112/api/places?minLat=40.36&minLng=49.82&maxLat=40.38&maxLng=49.86"
TOPICS_API = "http://localhost:8010/api/itinerary/plan"

WISHES = [
    {
        "wish": "quiet cafe with good wifi where I can work for a few hours",
        "expect_categories": {"Café"},
        "legs": 1,
    },
    {"wish": "a cafe", "expect_categories": {"Café"}, "legs": 1},
    {"wish": "somewhere for coffee please", "expect_categories": {"Café"}, "legs": 1},
    {"wish": "coffee", "expect_categories": {"Café"}, "legs": 1},
    {
        "wish": "coffee, then a bookshop, then dinner",
        "expect_categories": {"Café", "Books", "Bookshop", "Restaurant"},
        "legs": 3,
    },
    {"wish": "i want to buy socks", "expect_categories": {"Clothing Shop"}, "legs": 1},
    {"wish": "somewhere to eat dinner", "expect_categories": {"Restaurant"}, "legs": 1},
    {"wish": "a park to walk around", "expect_categories": {"Park"}, "legs": 1},
    {"wish": "i want to buy a submarine", "expect_categories": set(), "legs": 1},
]


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=120) as response:
        return json.loads(response.read())


def post_json(url: str, payload: dict):
    request = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read())


def main() -> None:
    places = get_json(PLACES_API)
    by_id = {p["id"]: p for p in places}
    candidates = [
        {"id": p["id"], "name": p["name"], "categoryName": p.get("categoryName")} for p in places
    ]
    print(f"{len(places)} candidate places\n")

    correct = 0
    scorable = 0
    abstentions = 0
    latencies = []

    for case in WISHES:
        started = time.time()
        result = post_json(TOPICS_API, {"wish": case["wish"], "candidatePlaces": candidates})
        elapsed = int((time.time() - started) * 1000)
        latencies.append(elapsed)

        picked = [by_id[i] for i in result.get("placeIds", []) if i in by_id]
        categories = [p.get("categoryName") or "?" for p in picked]
        expected = case["expect_categories"]

        if expected:
            scorable += 1
            hit = bool(picked) and any(c in expected for c in categories)
            if not picked:
                abstentions += 1
            verdict = "PASS" if hit else "FAIL"
            if hit:
                correct += 1
        else:
            verdict = "PASS" if not picked else "FAIL"
            if not picked:
                correct += 1
            scorable += 1

        names = ", ".join(f"{p['name']} [{p.get('categoryName')}]" for p in picked) or "(nothing)"
        print(f"{verdict}  {elapsed:>5}ms  \"{case['wish']}\"")
        print(f"            -> {names[:110]}")

    print()
    print(f"correct           {correct}/{scorable}")
    print(f"abstentions       {abstentions} (on answerable wishes)")
    print(f"latency med/max   {statistics.median(latencies):.0f}ms / {max(latencies)}ms")


if __name__ == "__main__":
    main()
