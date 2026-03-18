# Potential Design System Improvements

Liste moglicher Verbesserungen am Design-System (@newwork/nw-design-system), die im GBA-Projekt aufgefallen sind. Zweck: zentrale Liste fur Absprache mit dem DS-Team oder Backlog-Items. Keine Implementierung im GBA-Projekt, nur Dokumentation. Bei jedem Eintrag ist vermerkt, **wo im GBA-Projekt** die Anderung genutzt wurde oder wurde (Einsatzort).

---

## Tabs: Keep-Mounted-Option fur TabsContent

**Vorschlag:** `TabsContent`-Prop `forceMount` durchreichen (oder explizit dokumentieren), damit Consumer „keep mounted“-Verhalten ohne Workarounds nutzen konnen; alternativ Option `keepMounted` auf Root oder Content.

**Hintergrund:** Radix Tabs unmountet inaktive Inhalte standardmassig. Um Inhalte beim Tab-Wechsel gemountet zu halten (z.B. um erneutes Laden von Daten/AppActions zu vermeiden), ist aktuell `forceMount` auf `TabsContent` plus CSS zum Verstecken (z.B. `data-[state=inactive]:hidden`) notig. Die DS-Tabs-Komponente reicht diese Option aktuell nur durch; explizite Dokumentation oder eine semantische `keepMounted`-Prop ware hilfreich.

**Einsatzort im GBA:** Wurde in [SectionCard.tsx](src/common/components/common-relations/record-sections/section-card/SectionCard.tsx) genutzt werden, falls die Section-Tabs (Activities / Notes / Tasks) spater auf Design-System-Tabs umgestellt werden – dann einheitliches Tab-UI bei gleichem „keep mounted“-Verhalten.

---

## TabNav: Keine Tab-Panels/Content

**Vorschlag:** TabNav stellt nur die Navigations-Links (TabNav + TabNavLink) bereit; es gibt keine Tab-Panels/Content. Falls ein zusammengehoriges Tab-Panel-Pattern gewunscht ist, Erweiterung oder Kombination mit Tabs dokumentieren bzw. anbieten.

**Einsatzort im GBA:** Gleicher Kontext wie Tabs – Record-Section-Tabs (SectionCard). Falls TabNav fur die Tab-Leiste verwendet werden soll, muss das Content-Rendering weiterhin vom Consumer ubernommen werden; eine klare Empfehlung oder ein kombiniertes Pattern (TabNav + TabsContent) ware hilfreich.

---

## Weitere Eintrage

Weitere DS-Verbesserungsvorschlage (z.B. File-Upload-Konsistenz, Multi-Select-Patterns) bei Bedarf hier erganzen – jeweils mit kurzer Angabe, **wo im GBA-Projekt** die Anderung genutzt wurde/wurde (Komponente oder Feature).
