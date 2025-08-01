$filePath = "src\business-apps\crm\common\apps\task-management\components\TaskTable.tsx"
$content = Get-Content $filePath -Raw

# Replace the calendar icon section
$content = $content -replace '                      <div className="gba:flex gba:items-center gba:gap-2">\s*<PiCalendar size={16} className="gba:text-gray-400" />\s*<span className="gba:text-sm">\s*{formatDate\(record\.dueDate\)}\s*</span>\s*</div>', '                      <div>
                        <span className="gba:text-sm">
                          {formatDate(record.dueDate)}
                        </span>
                      </div>'

# Replace the clock emoji and fix margin
$content = $content -replace 'gba:ml-6">\s*\s*{formatDate\(record\.scheduleDate\)}', 'gba:mt-1">
                          {formatDate(record.scheduleDate)}'

$content | Set-Content $filePath
