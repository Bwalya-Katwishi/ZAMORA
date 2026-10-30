"""Render 50 pages and save the PDF text layer for a later OCR score.

The images and transcripts stay in data/raw, which is not part of the catalog.
"""

from __future__ import annotations

import json
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PDF = RAW / "penal-code-act.pdf"
PAGES = 50
DPI = 200
SOURCE = {
    "sourceTitle": "Penal Code Act",
    "sourceUrl": "https://www.parliament.gov.zm/sites/default/files/documents/acts/Penal%20Code%20Act.pdf",
    "publisher": "National Assembly of Zambia",
    "capturedOn": "2026-10-15",
    "sample": "pages 1-50",
    "dpi": DPI,
    "normalization": "lowercase letters and digits; other characters dropped",
    "screened": [
        {
            "title": "National Flag and Armorial Ensigns Act",
            "url": "https://www.parliament.gov.zm/sites/default/files/documents/acts/National%20Flag%20and%20Armorial%20Ensigns%20Act.pdf",
            "pages": 7,
            "pagesMissingText": 0,
        }
    ],
    "notFetched": "Gazette issue pages on gazettes.africa returned HTTP 403 to a download, so no gazette scan is in this sample.",
}


def main() -> None:
    doc = pymupdf.open(PDF)
    image_dir = RAW / "ocr-pages"
    image_dir.mkdir(parents=True, exist_ok=True)
    file_missing = 0
    for page in doc:
        text = page.get_text("text")
        if sum(ch.isalnum() for ch in text) < 20:
            file_missing += 1
    pages = []
    missing = 0
    for index in range(min(PAGES, doc.page_count)):
        page = doc[index]
        truth = page.get_text("text")
        layer = "present" if sum(ch.isalnum() for ch in truth) >= 20 else "missing"
        if layer == "missing":
            missing += 1
        image = image_dir / f"page-{index + 1:03}.png"
        truth_path = RAW / "ocr-truth" / f"page-{index + 1:03}.txt"
        truth_path.parent.mkdir(parents=True, exist_ok=True)
        if not image.exists():
            page.get_pixmap(dpi=DPI).save(image)
        truth_path.write_text(truth, encoding="utf-8")
        pages.append({"page": index + 1, "textLayer": layer})
        print(f"page {index + 1} {layer}", flush=True)
    report = {
        **SOURCE,
        "pagesInFile": doc.page_count,
        "pagesMissingTextInFile": file_missing,
        "pagesMissingTextInSample": missing,
        "pages": pages,
    }
    (RAW / "ocr-manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("rendered", len(pages), "missing_in_file", file_missing)


if __name__ == "__main__":
    main()
