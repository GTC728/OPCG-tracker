import html
import json
import pathlib
import urllib.request

CARDS_URL = "https://raw.githubusercontent.com/buhbbl/punk-records/main/english/index/cards_by_id.json"
PACKS_URL = "https://raw.githubusercontent.com/buhbbl/punk-records/main/english/packs.json"
GENERATED_AT = "2026-07-02T00:00:00.000Z"


def fetch_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def unique(values):
    seen = set()
    output = []
    for value in values:
        text = str(value).strip()
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            output.append(text)
    return output


def main():
    cards = fetch_json(CARDS_URL)
    packs = fetch_json(PACKS_URL)
    leaders = []

    for key, value in cards.items():
        if "_p" in key:
            continue
        if str(value.get("rarity", "")).lower() != "leader" and str(
            value.get("category", "")
        ).lower() != "leader":
            continue

        card_id = value.get("card_id") or key
        leader_name = html.unescape(value.get("name") or "")
        set_code = card_id.split("-")[0]
        pack = packs.get(str(value.get("pack_id")), {})
        pack_label = (pack.get("title_parts") or {}).get("label") or ""
        types = [html.unescape(item) for item in value.get("types") or []]

        aliases = [
            card_id,
            card_id.replace("-", ""),
            card_id.replace("-", " "),
            set_code,
            set_code.replace("-", ""),
            leader_name,
            pack_label,
            pack_label.replace("-", ""),
            *types,
        ]

        leaders.append(
            {
                "id": f"leader-{card_id.lower()}",
                "setCode": set_code,
                "leaderCode": card_id,
                "leaderName": leader_name,
                "colors": value.get("colors") or [],
                "displayName": f"{card_id} {leader_name}",
                "aliases": unique(aliases),
                "archived": False,
                "createdAt": GENERATED_AT,
                "updatedAt": GENERATED_AT,
            }
        )

    leaders.sort(key=lambda deck: (deck["setCode"], deck["leaderCode"]))

    output = (
        "// Auto-generated from buhbbl/punk-records english/index/cards_by_id.json.\n"
        "// Source data is derived from the official One Piece Card Game card list via vegapull.\n"
        "import type { Deck } from '@/types'\n\n"
        f"export const SEEDED_LEADER_DECKS: Deck[] = {json.dumps(leaders, ensure_ascii=False, indent=2)}\n"
    )

    target = pathlib.Path("src/data/leaderDecks.ts")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(output, encoding="utf-8")
    print(f"Generated {len(leaders)} leader decks -> {target}")


if __name__ == "__main__":
    main()
