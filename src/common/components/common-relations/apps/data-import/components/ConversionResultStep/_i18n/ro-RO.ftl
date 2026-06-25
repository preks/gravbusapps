# Conversion Result Step Translations (Romanian - Romania)

# Step Header
conversion-result-step-title = Pasul 3: Verificați și importați

# Action Buttons
download-json-button = Descarcă fișierul de date
start-over-button = Reîncepe
import-more-button = Importă mai multe
done-button = Terminat
continue-ownership-button = Continuă la relațiile de proprietate
skip-ownership-button = Omite proprietatea

# Success Messages
import-success-title = Import în curs
import-success-message = Cele { $count } { $entityType } sunt importate în background.
import-success-email-hint = Vă vom trimite un e-mail când importul este finalizat.
conversion-success-message = { $count } { $entityType } sunt gata de import

# Campaign
campaign-label = Campanie: { $name }

# Preview Section
preview-title = Previzualizare (primele { $count } { $entityType })
preview-more-text = ... și încă { $count } { $entityType }

# Preview Badges
industry-badge = Industrie
size-badge = Dimensiune

# Extraction Warnings Section
extraction-warnings-title = Avertismente de import

# Ownership Summary Section
ownership-summary-title = Relații de proprietate
ownership-summary-description = { $count } relație/relații de proprietate detectate. { $unresolvedCount } relație/relații mai au nevoie de un ID de companie rezolvat.
ownership-summary-unknown-company = Companie necunoscută
ownership-summary-owned-by = Deținută de: { $names }
ownership-summary-owns = Deține: { $names }
ownership-summary-more = ... și încă { $count } rând(uri) de companie cu relații de proprietate
ownership-company-unresolved-suffix =  (Nerezolvat)

# Executive Summary Section
executive-summary-title = Conducere companie
executive-summary-description = { $count } executiv(i) detectat(i). { $resolvedCount } rezolvat(i), { $unresolvedCount } nerezolvat(i).
executive-summary-unknown-company = Companie necunoscută
executive-summary-executives = Executivi: { $names }
executive-summary-executives-label = Executivi:
executive-summary-type = Tip: { $type }
executive-summary-more = ... și încă { $count } rând(uri) de companie cu executivi
executive-source-employee-suffix = (Angajat)
executive-source-contact-suffix = (Contact)
executive-source-unresolved-suffix = (Nerezolvat)
executive-source-unresolved-tooltip = Nu s-a găsit niciun Angajat sau Investment Contact corespunzător în sistem, așa că acest executiv nu va fi importat.

# Stakeholder Summary Section
stakeholder-summary-title = Stakeholderii companiei
stakeholder-summary-description = { $count } stakeholder(i) detectat(i). { $contactCount } ca Investment Contact, { $accountCount } ca Investment Account, { $externalCount } extern(i).
stakeholder-summary-unknown-company = Companie necunoscută
stakeholder-summary-stakeholders = Stakeholderi: { $names }
stakeholder-summary-more = ... și încă { $count } rând(uri) de companie cu stakeholderi
stakeholder-source-contact-suffix = (Investment Contact)
stakeholder-source-account-suffix = (Investment Account)
stakeholder-source-external-suffix = (Extern)

# Data Quality Section
data-quality-warnings-title = Avertismente privind calitatea datelor
show-less-button = Arată mai puțin
more-warnings-text = ... și încă { $count } avertismente
all-fields-good-message = Totul arată bine — sunteți gata de import!

# Import Button
import-button = Importă { $count } { $entityType }
importing-button = Se importă...

# Calitate CSV
csv-quality-warning-title = Problemă de aliniere a coloanelor detectată
csv-quality-warning-message = { $shiftedRows } din { $totalRows } rânduri pot avea coloane nealiniate. Puteți încerca să le corectați automat — unele valori se pot modifica.
csv-quality-repair-button = Încearcă corectarea automată și extragerea datelor
csv-quality-repairing-button = Se corectează...
csv-quality-residual-message = { $shiftedRows } rând(uri) nu au putut fi corectate complet. Aceste rânduri pot avea valori lipsă sau deplasate.
csv-quality-success-message = Toate rândurile au fost corectate cu succes.
