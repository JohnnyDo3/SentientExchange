const fs = require('fs');

// Read the test file
const filePath = './tests/unit/tools/purchase.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix all occurrences of purchaseService with 4 parameters
// Remove the mockDb parameter (3rd parameter)
content = content.replace(
  /await purchaseService\(mockRegistry, mockPaymentClient, mockDb, /g,
  'await purchaseService(mockRegistry, mockPaymentClient, '
);

content = content.replace(
  /const result = await purchaseService\(mockRegistry, mockPaymentClient, mockDb, /g,
  'const result = await purchaseService(mockRegistry, mockPaymentClient, '
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed purchase_service test function calls!');
console.log('Removed mockDb parameter from all purchaseService() calls');
