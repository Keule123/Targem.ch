# Anleitung: Umzug von Wix zur eigenen Website

Diese Anleitung führt Schritt für Schritt durch den Umzug von targem.ch weg von Wix
auf die neue statische Website in diesem Repository (Hosting: GitHub Pages, kostenlos).

**Wichtigste Regel: Wix erst kündigen, wenn die neue Website unter www.targem.ch
läuft und die E-Mail geprüft ist.** Solange nichts gekündigt ist, kann jeder Schritt
gefahrlos rückgängig gemacht werden.

---

## Ist-Zustand (geprüft am 19.07.2026)

| Was | Wo | Bedeutung |
|---|---|---|
| Domain targem.ch | **Hostpoint AG** (Schweizer Registrar, seit 16.02.2021) | ✅ Kein Domain-Transfer nötig — die Domain gehört nicht Wix! |
| DNS-Server | ns12/ns13.wixdns.net (**Wix**) | Muss auf Hostpoint-DNS umgestellt werden |
| Website | Wix (185.230.63.x) | Wird durch GitHub Pages ersetzt |
| E-Mail info@targem.ch | ~~Google Workspace via Wix~~ — **Abo abgelaufen, Konto gesperrt** | Wird NEU bei **Hostpoint** eingerichtet (Schritt 3b); alte Mails sind verloren (bewusste Entscheidung vom 19.07.2026) |

---

## Schritt 1: GitHub Pages aktivieren

1. Diesen Pull Request mergen (Branch in `main` übernehmen).
2. Auf GitHub: **Settings → Pages**
3. Bei „Source": **GitHub Actions** wählen (nicht „Deploy from a branch" — die
   Seite wird von einem automatischen Build-Workflow gebaut und veröffentlicht,
   das braucht auch das Redaktionssystem unter `/admin/`).
4. Einmalig den Workflow anstossen: Repo → **Actions** → „Build & Deploy to GitHub Pages" →
   **Run workflow** (oder einfach die nächste Änderung mergen — er läuft bei jedem
   Push auf `main` automatisch).
5. Nach 1–2 Minuten ist die Seite unter `https://keule123.github.io/Targem.ch/` erreichbar — kurz prüfen.

## Schritt 2: Eigene Domain bei GitHub eintragen

1. Weiter in **Settings → Pages**: bei „Custom domain" **www.targem.ch** eintragen und speichern.
   (GitHub legt dabei automatisch die Datei `CNAME` im Repository an.)
2. GitHub zeigt zunächst eine DNS-Warnung — die verschwindet nach Schritt 3.

## Schritt 3: DNS bei Hostpoint umstellen

Login im Hostpoint-Kontrollpanel (admin.hostpoint.ch) mit dem Konto, auf das die
Domain registriert ist.

1. **Nameserver umstellen:** Domain targem.ch → Nameserver von
   `ns12.wixdns.net` / `ns13.wixdns.net` auf die **Hostpoint-eigenen Nameserver**
   ändern. Damit übernimmt Hostpoint die DNS-Verwaltung (Wix hat dann keine
   Kontrolle mehr über die Domain-Einträge).
2. **DNS-Einträge bei Hostpoint anlegen** (DNS-Zone von targem.ch):

   | Typ | Name | Wert |
   |---|---|---|
   | A | `targem.ch` (Apex/@) | `185.199.108.153` |
   | A | `targem.ch` (Apex/@) | `185.199.109.153` |
   | A | `targem.ch` (Apex/@) | `185.199.110.153` |
   | A | `targem.ch` (Apex/@) | `185.199.111.153` |
   | CNAME | `www` | `keule123.github.io.` |
   | MX | `targem.ch` | `10 mx1.mail.hostpoint.ch.` |
   | MX | `targem.ch` | `10 mx2.mail.hostpoint.ch.` |
   | TXT | `targem.ch` | `v=spf1 redirect=spf.mail.hostpoint.ch` |

   ✉️ **E-Mail-Update (19.07.2026):** Das alte Google-Workspace-Postfach (über
   Wix gebucht) ist abgelaufen — die E-Mail wird neu bei **Hostpoint**
   eingerichtet (siehe Schritt 3b). Die MX-/SPF-Einträge oben zeigen deshalb
   auf die Hostpoint-Mailserver. Alte Google-Einträge (`aspmx.l.google.com` usw.)
   und der `google-site-verification`-TXT können gelöscht werden.
   Tipp: In der DNS-Verwaltung gibt es dafür auch die Autokonfiguration
   **«DNS-Einstellungen auf Hostpoint-Mailserver zurücksetzen»** — die setzt
   MX/SPF automatisch korrekt (die A-/CNAME-Einträge für die Website dabei
   stehen lassen!).
3. DNS-Änderungen brauchen bis zu einigen Stunden. Danach in GitHub
   **Settings → Pages** prüfen: die Domain-Warnung ist weg → Haken bei
   **„Enforce HTTPS"** setzen (GitHub stellt automatisch ein Gratis-Zertifikat aus).

## Schritt 3b: E-Mail-Postfach bei Hostpoint einrichten

Das Google-Workspace-Abo (über Wix) ist abgelaufen und wird bewusst NICHT
verlängert — die alten E-Mails sind damit verloren, das Postfach wird bei
Hostpoint neu aufgebaut (Schweizer Server, ab ca. CHF 3/Monat):

1. Im [Hostpoint Control Panel](https://admin.hostpoint.ch): Produkt
   **„E-Mail"** für die Domain targem.ch bestellen (E-Mail & Office,
   kleinstes Paket reicht: 1 Postfach, 15 GB).
2. Postfach **info@targem.ch** anlegen — das Passwort wird dabei selbst
   gewählt (Sally wählt es und bewahrt es im Passwort-Manager auf; kein
   zugesandtes Passwort nötig).
3. Lesen & Schreiben: per Browser über **webmail.hostpoint.ch** oder in der
   Mail-App auf Handy/Computer (Hostpoint zeigt die Einstellungen beim
   Anlegen des Postfachs an; Autokonfiguration funktioniert in den meisten
   Apps automatisch).
4. Falls die Mail-Einrichtung VOR der Nameserver-Umstellung (Schritt 3)
   passiert: erst nach der Umstellung kommen Mails im neuen Postfach an.

## Schritt 4: Alles testen (vor der Kündigung!)

- https://www.targem.ch öffnet die neue Website (Schloss-Symbol/HTTPS ok)
- https://targem.ch leitet auf www weiter
- Eine Test-E-Mail an info@targem.ch schicken → kommt im **Hostpoint-Webmail**
  an (webmail.hostpoint.ch)
- Auf dem Handy prüfen (Darstellung, Anruf-/WhatsApp-Buttons)

## Schritt 5: Wix kündigen

Stand 19.07.2026: Das Google-Workspace-E-Mail-Abo bei Wix ist bereits
abgelaufen und wird NICHT verlängert (Entscheidung: E-Mail neu bei Hostpoint,
siehe Schritt 3b). Damit ist die Kündigung einfach:

1. Erst wenn Schritt 4 vollständig grün ist (Website auf targem.ch UND
   Test-Mail im Hostpoint-Postfach angekommen): das **Wix-Premium-Abo
   (Website) kündigen** — Wix-Konto → Abonnements → Premium-Abo kündigen.
   Die Domain ist davon nicht betroffen, sie liegt bei Hostpoint.
2. Das abgelaufene E-Mail-Abo braucht keine Aktion — einfach ablaufen lassen,
   NICHT auf „Abo verlängern" klicken.
3. Bei der Gelegenheit kann die Domain-Verknüpfung im Wix-Dashboard entfernt
   werden (reine Aufräumarbeit, nach der Nameserver-Umstellung wirkungslos).
4. Das Wix-Konto selbst kann als Gratis-Konto bestehen bleiben (schadet nicht
   und man behält Zugriff auf die alten Inhalte) oder später gelöscht werden.

---

## Danach: Website pflegen

- Texte ändern: einfach die entsprechende Stelle in `index.html` bearbeiten
  (geht direkt auf GitHub im Browser: Datei öffnen → Stift-Symbol → ändern →
  „Commit changes"). Nach 1–2 Minuten ist die Änderung live.
- Preise stehen in `index.html` im Abschnitt „Preise".
- Die kompletten alten Wix-Inhalte (inkl. der nicht übernommenen Vorlagen-Seiten)
  sind unter `archiv/wix-inhalte/` gesichert.

## Was ist im Vergleich zu Wix anders?

| Wix-Funktion | Neue Lösung |
|---|---|
| Online-Buchungssystem | Buchung per Kontakt (E-Mail/Telefon/WhatsApp). Später nachrüstbar, z.B. mit Calendly (Gratis-Plan) |
| Kontaktformular mit Versand | Formular öffnet das E-Mail-Programm (mailto). Später nachrüstbar, z.B. mit Formspree (Gratis-Plan) |
| Mitglieder-Login | Entfällt (wurde nicht genutzt) |
| Blog | Entfällt (enthielt nur Wix-Demo-Artikel) |
| Shop | Entfällt (war leer) |
| Bewertungs-Umfrage | Entfällt (Feedback per E-Mail) |

**Neu dazugekommen:** Impressum, Datenschutzerklärung, deutlich schnellere
Ladezeit, bessere Suchmaschinen-Daten (SEO), WhatsApp-Kontakt — und CHF 0.–
Hosting-Kosten statt Wix-Abo.
