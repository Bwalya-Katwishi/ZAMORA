"""Baseline check for a ZAMORA indicator file.

This is not a forecast. It refuses to run unless a series has at least 12
annual observations, then compares a flat persistence line with a straight
trend on a three-year holdout. It never invents missing years.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def holdout(points: list[dict], holdout_n: int = 3) -> dict | None:
    ordered = sorted(points, key=lambda item: item["year"])
    if len(ordered) < 12 or len(ordered) - holdout_n < 8:
        return None
    train, test = ordered[:-holdout_n], ordered[-holdout_n:]
    last = train[-1]["value"]
    persist = sum(abs(point["value"] - last) for point in test) / len(test)
    xs = [point["year"] for point in train]
    ys = [point["value"] for point in train]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    den = sum((x - mean_x) ** 2 for x in xs)
    slope = 0 if den == 0 else sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / den
    intercept = mean_y - slope * mean_x
    trend = sum(abs(point["value"] - (intercept + slope * point["year"])) for point in test) / len(test)
    return {
        "persist_mae": round(persist, 2),
        "trend_mae": round(trend, 2),
        "train_end": train[-1]["year"],
        "forecast_issued": False,
    }


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "data/indicators/worldbank-zmb.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("countryCode") != "ZMB":
        print("Refusing: the file is not a Zambia series.", file=sys.stderr)
        return 2
    for series in payload["series"]:
        result = holdout(series["observations"])
        print(series["code"], result if result else "too few observations; no forecast issued")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
