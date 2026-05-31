#!/usr/bin/env python3
"""
arac_detayli_atmchiptuning_listesi.xlsx → NDJSON dönüştürücü.

Her satırı, ham (string) alanlarıyla tek bir JSON nesnesi olarak yazar.
İş mantığı (enum eşleme, normalizasyon, upsert) import-catalog.ts'te yapılır;
burada yalnızca xlsx hücreleri güvenli biçimde okunur (CSV tırnak sorunları olmadan).

Kullanım:
  python3 scripts/xlsx-to-ndjson.py <girdi.xlsx> [cikti.ndjson]
Cikti verilmezse stdout'a yazar.

Python stdlib'i kullanır — ek paket gerekmez.
"""
import sys, json, zipfile
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# xlsx kolon harfi → JSON alan adı (DATABASE_SCHEMA.md §4.5)
COLS = {
    "A": "source_path",       # Klasör Yolu
    "B": "brand",             # Marka
    "C": "model",             # Model
    "D": "nesil",             # Nesil ("2016 ->")
    "E": "engine_label",      # Motor
    "F": "fuel",              # Yakıt Tipi
    "G": "tuning_method",     # Yazılım Yöntemi
    "H": "engine_no",         # Motor Numarası
    "I": "displacement_cc",   # Silindir Hacmi ("1368 CC")
    "J": "bore",              # Boring X Slag
    "K": "compression_ratio", # Sıkıştırma Oranı
    "L": "stock_hp",
    "M": "stock_torque",
    "N": "total_stage",       # yok sayılır
    "O": "options",           # Ek Seçenekler (virgülle ayrılır)
    "P": "notes",             # Ek Bilgiler
    "Q": "stage1_hp",
    "R": "stage1_torque",
    "U": "stage1plus_hp",
    "V": "stage1plus_torque",
    # S,T,W,X kazanım kolonları türetilir — alınmaz.
}


def col_letter(ref: str) -> str:
    return "".join(c for c in ref if c.isalpha())


def main() -> None:
    if len(sys.argv) < 2:
        print("Kullanım: python3 scripts/xlsx-to-ndjson.py <girdi.xlsx> [cikti.ndjson]",
              file=sys.stderr)
        sys.exit(1)

    src = sys.argv[1]
    out = open(sys.argv[2], "w", encoding="utf-8") if len(sys.argv) > 2 else sys.stdout

    z = zipfile.ZipFile(src)

    shared = []
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(NS + "si"):
        shared.append("".join(t.text or "" for t in si.iter(NS + "t")))

    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = sheet.find(NS + "sheetData").findall(NS + "row")

    def cell_value(c) -> str:
        v = c.find(NS + "v")
        if v is None:
            return ""
        if c.get("t") == "s":
            return shared[int(v.text)]
        return v.text or ""

    count = 0
    for r in rows[1:]:  # başlık satırını atla
        cells = {col_letter(c.get("r")): cell_value(c) for c in r.findall(NS + "c")}
        rec = {field: (cells.get(letter, "") or "").strip()
               for letter, field in COLS.items()}
        if not rec.get("source_path") and not rec.get("brand"):
            continue  # tamamen boş satır
        out.write(json.dumps(rec, ensure_ascii=False) + "\n")
        count += 1

    if out is not sys.stdout:
        out.close()
    print(f"{count} satır yazıldı.", file=sys.stderr)


if __name__ == "__main__":
    main()
