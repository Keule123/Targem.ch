# Metadaten

- **Original-URL:** https://www.targem.ch/plans-pricing
- **Kanonischer Link (im HTML):** https://www.targem.ch/plans-pricing
- **`<title>`:** Pakete &amp; Preise | Targem! (dekodiert: "Pakete & Preise | Targem!")
- **`<meta name="description">`:** nicht vorhanden (kein Description-Meta-Tag im `<head>`)
- **og:title:** Pakete &amp; Preise | Targem!
- **og:description:** nicht vorhanden
- **twitter:title:** Pakete &amp; Preise | Targem!

Seitentyp: Wix-Pricing-Plans-Seite (App "Pricing Plans" / PaidPlans, Widget "PackagePicker"). Enthält 2 aktive, öffentlich sichtbare Pläne.

# Alle Abo-/Preispläne (vollständig, aus eingebetteten JSON-Daten der Pricing-Plans-API sowie sichtbarem HTML)

## Plan 1: "12 Privatkurse"

| Feld | Wert |
|---|---|
| Name | 12 Privatkurse |
| Plan-ID | e30d98e3-f6a6-47c6-9b89-a7e23134d188 |
| Slug | 12-privatkurse |
| Preis | CHF 800 (Flat Rate, einmalige Zahlung beim Kauf) |
| Beschreibungstext (Tagline, sichtbar) | "10 Kurse bezahlen Sie, 2 gehen auf´s Haus!" |
| Enthaltene Leistung(en) / Perk | Privatunterricht |
| Laufzeit / Gültigkeit | Beginn: bei Kauf ("ON_PURCHASE"); Ende: "UNTIL_CANCELLED" – d.h. kein festes Ablaufdatum, gültig bis zur Kündigung. Auf der Seite selbst wird keine Laufzeitangabe angezeigt (Feld "plan-duration" ist im HTML leer) |
| Kostenlose Testphase | keine (0 Tage) |
| Zusätzliche Gebühren | keine |
| Käufer kann selbst kündigen? | Nein (buyerCanCancel: false) – Kündigung/Verwaltung erfolgt offenbar nur über den Anbieter |
| Max. Käufe pro Käufer | unbegrenzt (0 = kein Limit) |
| Status/Sichtbarkeit | ACTIVE, PUBLIC, kaufbar (buyable: true), nicht archiviert |
| AGB/Terms and Conditions | leer (kein Text hinterlegt) |
| Call-to-Action-Button | "Sofort kaufen" |

## Plan 2: "6 Privatkurse"

| Feld | Wert |
|---|---|
| Name | 6 Privatkurse |
| Plan-ID | e8b48d8b-a102-4a80-92e4-0e166347e311 |
| Slug | 6-privatkurse |
| Preis | CHF 400 (Flat Rate, einmalige Zahlung beim Kauf) |
| Beschreibungstext (Tagline, sichtbar) | "Sie bezahlen nur fünf Kurse, einer ist gratis!" |
| Enthaltene Leistung(en) / Perk | Privatunterricht |
| Laufzeit / Gültigkeit | Beginn: bei Kauf ("ON_PURCHASE"); Ende: "UNTIL_CANCELLED" – kein festes Ablaufdatum. Feld "plan-duration" im HTML leer |
| Kostenlose Testphase | keine (0 Tage) |
| Zusätzliche Gebühren | keine |
| Käufer kann selbst kündigen? | Nein (buyerCanCancel: false) |
| Max. Käufe pro Käufer | unbegrenzt (0 = kein Limit) |
| Status/Sichtbarkeit | ACTIVE, PUBLIC, kaufbar (buyable: true), nicht archiviert |
| AGB/Terms and Conditions | leer (kein Text hinterlegt) |
| Call-to-Action-Button | "Sofort kaufen" |

Hinweis zur Verknüpfung mit Services: Beide Pläne sind laut Buchungssystem-Daten ausschliesslich mit dem Service "Privatunterricht" (CHF 80/Einzelsitzung) verknüpft (dessen Datensatz enthält `"pricingPlanIds": ["e30d98e3-f6a6-47c6-9b89-a7e23134d188", "e8b48d8b-a102-4a80-92e4-0e166347e311"]`). Die Services "Lektion im Duo" und "Lektion 3-4 Personen" akzeptieren laut Daten **keine** Preispläne (`"pricingPlan": false`).

Rechnerisch: "12 Privatkurse" für CHF 800 ⇒ CHF 66.67 pro Kurs (statt CHF 80 einzeln); "6 Privatkurse" für CHF 400 ⇒ CHF 66.67 pro Kurs (statt CHF 80 einzeln) – beide Pläne bieten denselben rabattierten Einzelpreis, nur unterschiedliche Paketgrösse/Vorauszahlung.

# Alle sichtbaren Texte in Dokumentreihenfolge

1. top of page (Sprungmarke, versteckter Skip-Link)
2. Start
3. Über mich
4. Sprachkurse
5. Übersetzungen & Dolmetschen
6. Kontakt
7. Bewertungen
8. Mehr
9. Anmelden
10. **Preisplan wählen** (H1, App-Titel)
11. 12 Privatkurse (Plantitel, H2)
12. 800CHF (Preis, Screenreader-Text; visuell "CHF" + "800" getrennt dargestellt)
13. 10 Kurse bezahlen Sie, 2 gehen auf´s Haus! (Tagline)
14. Sofort kaufen (Button)
15. Privatunterricht (Benefit/Leistung, Liste)
16. 6 Privatkurse (Plantitel, H2)
17. 400CHF (Preis, Screenreader-Text; visuell "CHF" + "400")
18. Sie bezahlen nur fünf Kurse, einer ist gratis! (Tagline)
19. Sofort kaufen (Button)
20. Privatunterricht (Benefit/Leistung, Liste)
21. Pakete & Preise: PaidPlans (versteckter A11y-Text)
22. ©2024 Targem! (Footer/Copyright)
23. bottom of page (Sprungmarke, versteckter Skip-Link)

# Bilder (static.wixstatic.com)

Keine planspezifischen Bilder vorhanden. Nur globale Template-Elemente (Kopf-/Fusszeile):

IMG: https://static.wixstatic.com/media/580601_842d5c0397344b42bcf04ea848221010~mv2.png | Header-Logo "logo_small.png", Bildkomponente comp-klhyufb2
IMG: https://static.wixstatic.com/media/580601_88687a5e0fd64685aa45cb6e409113c4~mv2.png | Header-Logo "logo_large.png", Bildkomponente comp-klhzc8wp
IMG: https://static.wixstatic.com/media/9f9c321c774844b793180620472aa4f1.png | Social-Media-Icon (Instagram-Link https://www.instagram.com/targem.ch/) in der Social-Media-Leiste des Headers
