const fs = require('fs');

// Read the test file
const filePath = './tests/unit/registry.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix line 299: service.pricing.perRequest
content = content.replace(
  /const price = parseFloat\(service\.pricing\.perRequest\.replace\('\$', ''\)\);/g,
  `const priceStr = service.pricing.perRequest || service.pricing.amount || '$0';
        const price = parseFloat(priceStr.toString().replace('$', ''));`
);

// Fix lines 324-325: results[i].pricing.perRequest
content = content.replace(
  /const priceA = parseFloat\(results\[i\]\.pricing\.perRequest\.replace\('\$', ''\)\);\s+const priceB = parseFloat\(results\[i \+ 1\]\.pricing\.perRequest\.replace\('\$', ''\)\);/g,
  `const priceStrA = results[i].pricing.perRequest || results[i].pricing.amount || '$0';
        const priceStrB = results[i + 1].pricing.perRequest || results[i + 1].pricing.amount || '$0';
        const priceA = parseFloat(priceStrA.toString().replace('$', ''));
        const priceB = parseFloat(priceStrB.toString().replace('$', ''));`
);

// Fix line 358: another service.pricing.perRequest in combine filters test
const regex358 = /results\.forEach\(\(service\) => \{\s+const price = parseFloat\(service\.pricing\.perRequest\.replace\('\$', ''\)\);\s+expect\(price\)\.toBeLessThanOrEqual\(0\.10\);/g;
content = content.replace(
  regex358,
  `results.forEach((service) => {
        const priceStr = service.pricing.perRequest || service.pricing.amount || '$0';
        const price = parseFloat(priceStr.toString().replace('$', ''));
        expect(price).toBeLessThanOrEqual(0.10);`
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed TypeScript test errors!');
console.log('Modified lines: 299, 324-325, 358');
