# Mapping Review Step Translations (Romanian - Romania)

# Step Header
mapping-review-step-title = Pasul 2: Verificați potrivirea coloanelor

# Buttons
start-over-button = Reîncepe
convert-button = Continuați cu { $count } { $entityType }
convert-button-no-count = Continuați cu { $entityType }
converting-button = Se pregătesc datele...

# Summary Section
ai-detected-summary = Am găsit { $sourceCount } coloane în fișierul dvs. și am potrivit { $mappedCount } dintre ele.
unmapped-fields-warning = { $count } coloane încă necesită o potrivire

# Section Titles
mapped-fields-title = Coloane potrivite
unmapped-fields-title = Coloane nepereche ({ $count })
relationship-columns-title = Coloane de relații
relationship-hint-company-columns = Includeți o coloană cu numele companiei plus coloane „Owned By” și/sau „Owns”. Separați mai multe nume de companii cu punct și virgulă.
relationship-hint-percentages = Procentele precum „Beta Holdings (50%)” sunt acceptate în coloanele de proprietate.
relationship-hint-executives = „Executives” conține nume de persoane (separate prin punct și virgulă). Fiecare nume este căutat mai întâi printre Angajați, apoi printre Investment Contacts; numele negăsite sunt ignorate.
relationship-hint-executive-type = „Executive Type” aplică un singur rol (de ex. CEO, CFO) tuturor executivilor din rândul respectiv și trebuie să corespundă unei intrări din catalogul `LegalEntityExecutiveType`.
relationship-hint-stakeholders = „Stakeholders” acceptă intrări de forma `Nume, Tip` separate prin punct și virgulă (de ex. `Mike, Audit; Anna, Legal`). Fiecare nume este căutat mai întâi printre Investment Contacts, apoi printre Investment Accounts; dacă nu se găsește nicio potrivire, intrarea este păstrată ca stakeholder extern.

# Field Labels
source-field-label = Coloana dvs.
target-field-label = Se potrivește cu
type-label = Tip
select-field-placeholder = Selectați un câmp
search-field-placeholder = Căutați câmpuri...
no-fields-found = Nu s-au găsit câmpuri

# Type Values
type-catalog = Catalog
type-direct = Direct

# Unmapped Section
click-to-add-hint = Faceți clic pe o coloană pentru a adăuga o potrivire

# Error State
no-analysis-data = Nu a fost analizat încă niciun fișier. Încărcați un fișier și analizați-l mai întâi.
