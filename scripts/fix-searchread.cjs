const fs = require('fs');

// Read the file
let content = fs.readFileSync('scripts/test-odoo-comprehensive.ts', 'utf8');

// Replace all occurrences where searchRead has {domain:..., fields:..., limit:...} pattern
// Handle cases with domains that contain nested arrays
content = content.replace(
  /searchRead\(([^,\n]+),\s*\{[\s\n]*domain:\s*(\[[^\]]*(?:\[[^\]]*\][^\]]*)*\]),[\s\n]*fields:\s*(\[[^\]]*\]),[\s\n]*limit:\s*(\d+)[\s\n]*\}\)/gs,
  'searchRead($1, $2, { fields: $3, limit: $4 })'
);

// Handle empty domain cases: {domain: [], fields: [...], limit: N}
content = content.replace(
  /searchRead\(([^,\n]+),\s*\{[\s\n]*domain:\s*\[\s*\],[\s\n]*fields:\s*(\[[^\]]*\]),[\s\n]*limit:\s*(\d+)[\s\n]*\}\)/gs,
  'searchRead($1, [], { fields: $2, limit: $3 })'
);

// Write the fixed content
fs.writeFileSync('scripts/test-odoo-comprehensive.ts', content);

console.log('Fixed all searchRead calls!');
