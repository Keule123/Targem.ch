# targem.ch

Website von **Targem!** — Sprachkurse (Deutsch, Arabisch, Ägyptisch-Arabisch),
Übersetzungen, Korrekturlesen und Dolmetschen von Sally Mobasher, Rüfenacht (BE), Schweiz.

Statische Website mit kleinem Build-Schritt (Node, ohne npm-Abhängigkeiten) und
einem Redaktionssystem (CMS), damit die Inhalte ohne Programmierkenntnisse
gepflegt werden können. Gehostet mit GitHub Pages unter https://www.targem.ch.

## Struktur

| Pfad | Inhalt |
|---|---|
| `content/` | **Die Inhalte** als einfache Daten-Dateien (`*.json`) — hier steckt der ganze Text |
| `templates/` | HTML-Vorlagen mit Platzhaltern (`index`, `impressum`, `datenschutz`, `404`) |
| `admin/` | Redaktionssystem **Sveltia CMS** (selbst gehostet) + Konfiguration |
| `build.mjs` | Baut aus `content/` + `templates/` die fertige Website nach `dist/` |
| `css/`, `js/`, `assets/` | Stylesheet, minimales JavaScript, Bilder & selbst gehostete Schriften |
| `.github/workflows/` | GitHub-Actions-Workflow: baut und veröffentlicht die Seite automatisch |
| `dist/` | **Generiert** — die fertige Website (nicht eingecheckt, siehe `.gitignore`) |
| `ANLEITUNG.md` | Anleitung: DNS umstellen, GitHub Pages aktivieren, Wix kündigen |
| `ADMIN-ANLEITUNG.md` | Anleitung für die Inhaberin: Inhalte im CMS selbst pflegen |
| `archiv/wix-inhalte/` | Gesicherte Inhalte der alten Wix-Website (Volltexte, Bild-URLs) |

## Inhalte pflegen (ohne Technik)

Über das Admin-Panel **https://www.targem.ch/admin/** anmelden (mit GitHub) und
Texte, Angebote, Preise oder Neuigkeiten ändern. Beim Speichern wird die Änderung
automatisch übernommen und ist nach 1–2 Minuten live. Details in `ADMIN-ANLEITUNG.md`.

## Lokal ansehen

```bash
node build.mjs && python3 -m http.server -d dist 8000
# dann http://localhost:8000 öffnen
```

`node build.mjs` liest `content/*.json` und `templates/*.html` und schreibt die
fertige Website nach `dist/` (inkl. `sitemap.xml`, `robots.txt` und Kopien von
`css/`, `js/`, `assets/`, `admin/`). Es sind **keine** `npm install`-Schritte nötig.

## Wie das Veröffentlichen funktioniert

1. Inhalt im CMS speichern → Commit in den Branch `main`.
2. GitHub Actions (`.github/workflows/deploy.yml`) startet automatisch, führt
   `node build.mjs` aus und lädt `dist/` zu GitHub Pages hoch.
3. Nach 1–2 Minuten ist die Änderung unter https://www.targem.ch live.
