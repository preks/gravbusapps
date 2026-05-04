const fs = require('fs');

const filepath = '/tmp/every-agent-ya8YjR/repo/src/business-apps/hr/core/apps/manager-dashboard/ManagerDashboard.tsx';
const content = fs.readFileSync(filepath, 'utf8');

const first = content.indexOf("import React, { useState } from 'react'");
console.log('First React import at char:', first);

if (first === -1) {
    console.log('ERROR: First React import not found');
    process.exit(1);
}

const second = content.indexOf("import React, { useState } from 'react'", first + 1);
console.log('Second React import at char:', second);

if (second !== -1) {
    const original = content.slice(0, second);
    fs.writeFileSync(filepath, original, 'utf8');
    console.log('Truncated from', content.length, 'to', original.length, 'chars');
} else {
    console.log('No duplicate found');
    console.log('File length:', content.length, 'chars');
}
