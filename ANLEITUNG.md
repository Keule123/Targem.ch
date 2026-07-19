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
| E-Mail info@targem.ch | **Google Workspace** (MX: aspmx.l.google.com) | ⚠️ Vor der Kündigung prüfen, ob das Google-Abo über Wix bezahlt wird! |

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
   | MX | `targem.ch` | `10 aspmx.l.google.com.` |
   | MX | `targem.ch` | `20 alt1.aspmx.l.google.com.` |
   | MX | `targem.ch` | `30 alt2.aspmx.l.google.com.` |
   | MX | `targem.ch` | `40 alt3.aspmx.l.google.com.` |
   | MX | `targem.ch` | `50 alt4.aspmx.l.google.com.` |
   | TXT | `targem.ch` | `google-site-verification=IMjupHlFvfbBUo45X3sRYYG2HQPZfqT6OBCLiMC14iE` |

   ⚠️ **Die MX- und TXT-Einträge sind Pflicht** — sie sorgen dafür, dass die
   E-Mail info@targem.ch weiter bei Google ankommt. Sie sind oben exakt so
   aufgeführt, wie sie aktuell bei Wix gesetzt sind (Stand 19.07.2026).
3. DNS-Änderungen brauchen bis zu einigen Stunden. Danach in GitHub
   **Settings → Pages** prüfen: die Domain-Warnung ist weg → Haken bei
   **„Enforce HTTPS"** setzen (GitHub stellt automatisch ein Gratis-Zertifikat aus).

## Schritt 4: Alles testen (vor der Kündigung!)

- https://www.targem.ch öffnet die neue Website (Schloss-Symbol/HTTPS ok)
- https://targem.ch leitet auf www weiter
- Eine Test-E-Mail an info@targem.ch schicken → kommt an
- Auf dem Handy prüfen (Darstellung, Anruf-/WhatsApp-Buttons)

## Schritt 5: E-Mail-Abo prüfen, dann Wix kündigen

1. **Zuerst prüfen:** Im Wix-Konto unter **Abonnements/Subscriptions** nachsehen,
   ob dort „Google Workspace" (oder „G Suite") als Abo auftaucht.
   - **Falls ja:** Das E-Mail-Abo läuft über Wix und würde bei einer Konto-Kündigung
     mit gekündigt! In diesem Fall vor der Wix-Kündigung bei Google eine
     [Übertragung des Workspace-Abos zu Google Direct](https://support.google.com/a/answer/7643790)
     durchführen (Google-Support hilft dabei, die Mailbox bleibt erhalten).
   - **Falls nein** (Abo läuft direkt bei Google): kein Handlungsbedarf.
2. Erst wenn Schritt 4 vollständig grün ist: das **Wix-Premium-Abo kündigen**
   (Wix-Konto → Abonnements → Premium-Abo kündigen). Die Domain ist davon nicht
   betroffen — sie liegt bei Hostpoint.
3. Das Wix-Konto selbst kann als Gratis-Konto bestehen bleiben (schadet nicht und
   man behält Zugriff auf die alten Inhalte) oder später gelöscht werden.

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
