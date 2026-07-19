# targem.ch

Website von **Targem!** — Sprachkurse (Deutsch, Arabisch, Ägyptisch-Arabisch),
Übersetzungen, Korrekturlesen und Dolmetschen von Sally Mobasher, Rüfenacht (BE), Schweiz.

Statische Website ohne Baukasten und ohne Abhängigkeiten — abgelöst von Wix.
Gehostet mit GitHub Pages unter https://www.targem.ch.

## Struktur

| Pfad | Inhalt |
|---|---|
| `index.html` | Die Website (Einseiter mit Anker-Navigation) |
| `impressum.html`, `datenschutz.html` | Rechtsseiten |
| `css/`, `js/`, `assets/` | Stylesheet, minimales JavaScript, Bilder & selbst gehostete Schriften |
| `ANLEITUNG.md` | **Schritt-für-Schritt-Anleitung**: DNS umstellen, GitHub Pages aktivieren, Wix kündigen |
| `archiv/wix-inhalte/` | Gesicherte Inhalte der alten Wix-Website (Volltexte, Bild-URLs) |

## Lokal ansehen

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Website ändern

Text in `index.html` anpassen (direkt auf GitHub möglich: Datei → Stift-Symbol →
ändern → Commit). Änderungen sind nach 1–2 Minuten live.
