# Ungenutzte Komponenten im AI Builder

Die folgenden Komponenten sind im `components/` Ordner vorhanden, werden aber aktuell nicht im AIBuilder verwendet:

## Zu prüfen / potentiell zu löschen:

1. **FileTreeViewer.tsx**
   - Wird nirgendwo importiert oder verwendet
   - Status: Komplett ungenutzt

2. **PreviewPanel.tsx**
   - Wird nirgendwo importiert oder verwendet
   - Status: Komplett ungenutzt

3. **RepositoryInfo.tsx**
   - Wird nirgendwo importiert oder verwendet
   - Status: Komplett ungenutzt

4. **UsageStats.tsx**
   - Wird nirgendwo importiert oder verwendet
   - Status: Komplett ungenutzt

5. **PublishDialog.tsx**
   - Existiert als Komponente, aber wird nicht verwendet
   - Der Publish Dialog ist aktuell direkt im AIBuilder.tsx inline implementiert (Zeile 1811-2049)
   - Status: Redundant, könnte die inline-Implementierung ersetzen

## Empfehlung:

- Diese Komponenten entweder löschen oder dokumentieren, warum sie behalten werden sollen
- Falls sie für zukünftige Features gedacht sind, sollte das in den Datei-Kommentaren stehen
- PublishDialog.tsx könnte genutzt werden, um die inline-Implementierung zu ersetzen
