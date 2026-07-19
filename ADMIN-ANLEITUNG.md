# Admin-Anleitung für Targem!

Diese Anleitung erklärt, wie Sally die Website **selbst pflegen** kann — Texte ändern,
Angebote und Preise anpassen, Neuigkeiten veröffentlichen, Bilder hochladen und die
Online-Terminbuchung verwalten. Ganz ohne Programmierung.

**Das Admin-Panel:** https://www.targem.ch/admin/
(solange die Domain noch nicht umgestellt ist: https://keule123.github.io/Targem.ch/admin/)

---

## Warum es kein „zugeschicktes Passwort" gibt

Passwörter werden aus Sicherheitsgründen **nie per E-Mail verschickt** — eine E-Mail
kann mitgelesen werden. Stattdessen werden die zwei benötigten Konten direkt mit der
Adresse **info@targem.ch** erstellt, und Sally wählt ihre Passwörter dabei selbst.
Alle Bestätigungs-Links kommen automatisch in ihr Postfach. Bei Verlust hilft immer
die „Passwort vergessen"-Funktion des jeweiligen Dienstes.

Es braucht genau **zwei Konten**:

| Konto | Wofür | Erstellen auf |
|---|---|---|
| GitHub | Anmeldung im Admin-Panel (dort liegt die Website) | github.com/signup |
| Cal.com | Terminbuchungs-Kalender | cal.com/signup |

---

## Einmalige Einrichtung (ca. 20 Minuten, am besten gemeinsam mit Karim)

### A. GitHub-Konto für Sally

1. Auf **github.com/signup** ein Konto erstellen: E-Mail **info@targem.ch**,
   Passwort selbst wählen, Benutzername z.B. `targem-sally`.
   → Der Bestätigungscode kommt an info@targem.ch.
2. **Karim** lädt das neue Konto ins Website-Repository ein:
   Repo `Keule123/Targem.ch` → **Settings → Collaborators → Add people** →
   `targem-sally` eintragen.
   → Die Einladung kommt per E-Mail an info@targem.ch — Link anklicken und annehmen.

### B. Zugangs-Schlüssel für das Admin-Panel

Das Admin-Panel meldet sich mit einem persönlichen Zugangs-Schlüssel (Token) an —
das ist wie ein sehr langes Passwort, das nur für die Website gilt:

1. Auf GitHub (angemeldet als `targem-sally`): oben rechts Profilbild →
   **Settings → Developer settings → Personal access tokens → Fine-grained tokens →
   Generate new token**
2. Ausfüllen: Name `Targem Admin`, Ablauf (Expiration) z.B. 1 Jahr,
   bei „Repository access" **Only select repositories** → `Keule123/Targem.ch` wählen,
   bei „Permissions → Repository permissions" nur **Contents: Read and write** setzen.
3. **Generate token** → den angezeigten Schlüssel kopieren und sicher aufbewahren
   (Passwort-Manager oder aufgeschrieben an sicherem Ort).
4. **https://www.targem.ch/admin/** öffnen → Anmeldung per Token wählen →
   Schlüssel einfügen. Der Browser merkt sich die Anmeldung.

*Läuft der Schlüssel ab oder geht verloren: einfach unter dem gleichen Menüpunkt
einen neuen erzeugen — es geht nichts kaputt.*

### C. Cal.com-Konto für die Terminbuchung

1. Auf **cal.com/signup** ein Konto erstellen: E-Mail **info@targem.ch**,
   Passwort selbst wählen, Benutzername z.B. `targem` (ergibt den Link cal.com/targem).
   Sprache in den Einstellungen auf Deutsch stellen.
2. **Verfügbarkeit** festlegen (z.B. Mo–Fr 9–18 Uhr) — nur in diesen Zeiten können
   Termine gebucht werden.
3. **Ereignistypen (Event Types)** anlegen — je Angebot einen, alle 50 Minuten:
   - „Privatunterricht" (CHF 80)
   - „Lektion im Duo" (CHF 100)
   - „Lektion 3–4 Personen" (CHF 120)
   Preis und Hinweise (z.B. „Bezahlung per Rechnung/TWINT nach der Lektion") in die
   Beschreibung schreiben.
4. **Google Kalender verbinden**: Cal.com → Apps → Google Calendar → mit
   info@targem.ch anmelden. Ab jetzt werden Buchungen automatisch im Kalender
   eingetragen und Doppelbuchungen verhindert. Optional Google Meet als Video-Ort
   wählen — Kund*innen bekommen den Link automatisch.
5. Den eigenen Buchungslink kopieren (z.B. `https://cal.com/targem`) und im
   **Admin-Panel → Terminbuchung** einfügen + den Schalter **aktiv** einschalten.
   → Die Buchungs-Sektion erscheint automatisch auf der Website.

---

## Wo landen die Buchungen?

- **E-Mail an info@targem.ch** bei jeder neuen Buchung (mit Name, Anliegen, Zeit)
- **Google Kalender** von info@targem.ch (automatisch eingetragen)
- Verwalten (verschieben, absagen, Nachricht an Kund*innen) direkt auf **cal.com**
  im Bereich „Bookings" — auch die Kund*innen können über ihren Bestätigungslink
  selbst umbuchen, der Kalender bleibt automatisch aktuell.

---

## Tägliche Bedienung des Admin-Panels

Nach der Anmeldung auf /admin/ erscheinen links die Bereiche:

| Bereich | Was man dort ändern kann |
|---|---|
| **Startseite** | Alle Texte: Willkommens-Bereich, Über mich, Sprachkurse, Übersetzungen, Kontakt |
| **Angebote** | Die Kurs-Karten: Titel, Preis, Dauer — Angebote hinzufügen, ändern, löschen |
| **Sparpakete** | Die Paket-Angebote (z.B. 6er-/12er-Abo) |
| **Aktuell** | Neuigkeiten veröffentlichen (erscheinen als „Aktuell" auf der Website) |
| **Terminbuchung** | Buchungs-Link eintragen und ein-/ausschalten |
| **Allgemein** | Kontaktdaten, Instagram, Adresse |
| **Rechtliches** | Impressum und Datenschutzerklärung |

**Speichern → nach 1–2 Minuten ist die Änderung live.** (Im Hintergrund speichert
das Panel die Änderung im Website-Repository, und die Seite wird automatisch neu
gebaut und veröffentlicht.)

Bilder: In den Bereichen mit Bildfeld einfach hochladen — sie landen automatisch
im richtigen Ordner.

---

## Wenn etwas nicht klappt

1. Änderung nicht sichtbar? 2 Minuten warten, dann Seite mit Strg+F5 neu laden.
2. Anmeldung im Admin-Panel klappt nicht? Neuen Zugangs-Schlüssel erzeugen (Abschnitt B).
3. Im Zweifel: Karim fragen — oder eine Claude-Code-Session im Repo starten und das
   Problem beschreiben.
