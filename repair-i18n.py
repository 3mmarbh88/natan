from pathlib import Path

def repair_mojibake(text):
    current = text

    # Repeatedly reverse common UTF-8 -> Latin-1/Windows-1252 corruption.
    for _ in range(3):
        try:
            repaired = current.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break

        # Only accept the conversion when it actually reduces
        # the common mojibake markers.
        bad_before = sum(current.count(x) for x in ("ط", "ظ", "â", "ð", "Ã", "Â"))
        bad_after = sum(repaired.count(x) for x in ("ط", "ظ", "â", "ð", "Ã", "Â"))

        if bad_after < bad_before:
            current = repaired
        else:
            break

    return current


source = Path(r".\src\utils\i18n.tsx")
backup = Path(r".\src\utils\i18n.tsx.backup")
test_output = Path(r".\src\utils\i18n.repaired.test.tsx")

original = backup.read_text(encoding="utf-8")
repaired = repair_mojibake(original)

test_output.write_text(repaired, encoding="utf-8")

print("Original :", len(original), "characters")
print("Repaired :", len(repaired), "characters")
print("Test file:", test_output)
print()
print("Sample:")
for line in repaired.splitlines():
    if "myAccount:" in line or "whatsappSupport:" in line or "startMonitoring:" in line:
        print(line)
