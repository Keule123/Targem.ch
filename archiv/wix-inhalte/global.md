# Globale Elemente (aus home.html extrahiert)

Diese Elemente (Header/Navigation, Footer, Logo, Farben, Fonts, Kontaktdaten) sind auf allen vier untersuchten Seiten identisch bzw. gelten site-weit.

## Logo

- Grosses Logo (Header, Desktop-Ansicht oben):
  IMG: https://static.wixstatic.com/media/580601_88687a5e0fd64685aa45cb6e409113c4~mv2.png | title="logo_large.png", alt leer
- Kleines Logo (sticky/kompakter Header beim Scrollen):
  IMG: https://static.wixstatic.com/media/580601_842d5c0397344b42bcf04ea848221010~mv2.png | title="logo_small.png", alt leer
  (Dasselbe Bild wird auf der Startseite zusätzlich mehrfach als dekoratives Grafikelement im Hero- und Kontakt-Bereich wiederverwendet.)
- Kein Text-Logo vorhanden; es handelt sich um Bild-Logos ohne sichtbaren Alt-Text.

## Hauptnavigation

Die Navigation besteht aus Sprungmarken (Anchor-Links) innerhalb der Startseite – alle Menüpunkte verweisen technisch auf href="https://www.targem.ch" (jeweils mit einem internen data-anchor-Attribut, das zur passenden Sektion der Startseite scrollt), NICHT auf eigene Unterseiten:

1. Start → Anker "Start: Willkommen" (Hero-Bereich, H1 "Willkommen bei Targem!")
2. Über mich → Anker "Start: Über uns" (H2 "Über mich")
3. Sprachkurse → Anker (H2 "Sprachkurse Privat und in Gruppen")
4. Übersetzungen & Dolmetschen → Anker (H2 "Übersetzungen, Korrekturlesen und Dolmetschen")
5. Kontakt → Anker "Start: Kontakt" (H2 "Kontakt")
6. Bewertungen → Anker "Start: Bewerten Sie uns" (H2 "Bewerten Sie mich!")
7. "Mehr" → Dropdown-Menüpunkt, aktuelles Untermenü ist LEER (`<ul id="...moreContainer"></ul>` ohne Einträge)

Zusätzlich rechts im Header: [Button] "Anmelden" (Wix-Mitglieder-Login, Standard-Avatar-Icon, kein eigenes Ziel/Formular sichtbar im statischen HTML).

WICHTIGE AUFFÄLLIGKEIT: Die drei separat gemirrorten Seiten merkmale.html, dienstleistungen.html und preisangebot.html sind NICHT über diese Hauptnavigation erreichbar (auch nicht über "Mehr", das leer ist). Sie existieren laut eingebetteter Wix-Routing-Konfiguration als eigene statische Seiten (Slugs "/merkmale", "/dienstleistungen", "/preisangebot"), sind aber offenbar nicht verlinkt/veröffentlicht im sichtbaren Menü – vermutlich Wix-Vorlagenseiten, die beim Erstellen der Website automatisch angelegt, aber nie mit echtem Inhalt befüllt oder verlinkt wurden.

## Footer (identisch auf allen Seiten)

- Social-Media-Leiste (aria-label "Social-Media-Leiste"): nur 1 Icon
  - Instagram: Link https://www.instagram.com/targem.ch/, IMG: https://static.wixstatic.com/media/9f9c321c774844b793180620472aa4f1.png | alt "Instagram"
- Copyright-Text: "©2024 Targem!"
- Keine weiteren Footer-Links (kein Impressum, keine Datenschutzerklärung, kein "Powered by Wix"-Hinweis, keine AGB im sichtbaren HTML gefunden).

## Kontaktdaten (aus dem Kontakt-Bereich der Startseite)

- Adresse: 3075 Rüfenacht, Schweiz
- E-Mail: info@targem.ch (mailto-Link)
- Telefon: +41 77 409 05 53

## Social-Media-Links

- Instagram: https://www.instagram.com/targem.ch/ (einziger gefundener Social-Media-Link, im Footer aller Seiten)

## Farbschema (aus CSS-Variablen `--color_N` im HTML von home.html, RGB → Hex umgerechnet)

Basis-/Layout-Farben (aus Kontext identifizierbar):
- Seitenhintergrund (`--color_11`, auch color_0/6/26/31/36/44/50/51/56/57/62/63): `#FFFEF8` – warmes Creme-Weiss
- Haupttextfarbe (`--color_45`, auch color_1/3/10/15/25/37/42/46): `#123033` (sehr dunkles Petrol/Tannengrün) bzw. `#264346` (helleres Petrol)
- Primäre Akzent-/Markenfarbe Türkis (`--color_13/39/43`, u.a. für Textlinks "txts"): `#59BBC5`
- Dunkleres Türkis/Teal (`--color_9/14/24/40/47`): `#2E7B83`
- Helles Türkis (`--color_7/12/21/22/23/38`): `#AADCE1` bzw. `#CBE0E3` / `#97C2C6` / `#63A3AA`
- Orange/Terracotta Akzent, u.a. für Link-/Aktionsfarbe (`--color_19`, "links-and-actions-color"): `#EE8728`
- Dunkles Braun-Orange (`--color_20`): `#81430A`
- Pfirsich/Beige Sekundärfarbe (`--color_2/18/41/48/49/52/53/58/59/60/61`): `#F8CFA9`
- Helles Pfirsich (`--color_16/17`): `#FDEFE2` / `#FADFC6`
- Gold/Gelb Akzent (`--color_28/29/33/34`): `#E7DB86` (hell) bzw. `#EFCA00` (kräftig)
- Dunkles Oliv/Gold (`--color_30/35`): `#655B14` / `#776500`

Zusammengefasst wirkt das Farbschema wie: Creme-Weiss als Basis, dunkles Petrolgrün/Blau als Textfarbe, Türkis als Hauptakzent, Pfirsich/Orange/Gold als warme Sekundärakzente (insgesamt ~5 Farbpaletten à 11 Abstufungen, typisch für ein Wix-Theme).

## Schriftarten (aus CSS-Variablen `--font_N` in home.html)

- Überschriften (H1–H3, grosse Zahlen wie 88px/72px/50px/40px/28px/22px): **"Playfair Display"**, serif
  - z. B. `--font_3: normal normal normal 88px/1.2em 'playfair display',serif` (grösste Überschrift)
  - `--font_0: 22px 'playfair display',serif` (kleinere Überschrift/Zitat-Stil)
- Fliesstext/Absätze/Buttons (14–20px): **"Montserrat"**, sans-serif
  - z. B. `--font_7: 20px montserrat,sans-serif`, `--font_1/--font_10: 14px montserrat,sans-serif` (Footer-Copyright nutzt font_10)

Damit nutzt die Website eine klassische Kombination aus einer Serifenschrift (Playfair Display) für Überschriften/Eleganz und einer schlichten Grotesk (Montserrat) für Lesetext.

## Sonstige globale Beobachtungen

- Seitensprache: `<html lang="de">` auf allen Seiten.
- Generator: "Wix.com Website Builder".
- Skip-Links "top of page" / "bottom of page" sind auf jeder Seite vorhanden (Barrierefreiheits-Feature von Wix, kein sichtbarer Inhalt).
- Auf jeder Seite gibt es einen unsichtbaren Screenreader-Hinweistext: "Use tab to navigate through the menu items."
