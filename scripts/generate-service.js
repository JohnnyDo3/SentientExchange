const fs = require('fs');
const path = require('path');

// Check arguments
if (process.argv.length < 6) {
  console.log('Usage: node generate-service.js <service-name> <port> <price> <description>');
  console.log('Example: node generate-service.js company-data-api 3004 0.75 "Company data API service"');
  process.exit(1);
}

const serviceName = process.argv[2];
const port = process.argv[3];
const price = process.argv[4];
const description = process.argv[5];

// Convert service-name to ServiceName (PascalCase)
const serviceClass = serviceName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join('');

console.log(`🚀 Generating service: ${serviceName}`);
console.log(`📦 Port: ${port}`);
console.log(`💰 Price: $${price} USDC`);
console.log(`📝 Description: ${description}`);

const templateDir = path.join(__dirname, '..', 'examples', 'web-scraper');
const targetDir = path.join(__dirname, '..', 'examples', serviceName);

// Copy directory recursively
function copyDir(src, dest, replacements) {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and dist
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      copyDir(srcPath, destPath, replacements);
    } else {
      // Copy file and apply replacements
      let content = fs.readFileSync(srcPath, 'utf8');

      // Apply all replacements
      for (const [find, replace] of Object.entries(replacements)) {
        const regex = new RegExp(find, 'g');
        content = content.replace(regex, replace);
      }

      fs.writeFileSync(destPath, content, 'utf8');
    }
  }
}

// Define replacements
const replacements = {
  'web-scraper-x402': `${serviceName}-x402`,
  'web-scraper': serviceName,
  'Web Scraper Service': `${serviceClass} Service`,
  'web scraping service': description,
  'Web scraping service': description,
  'AI-powered web scraping service for competitor analysis': description,
  'PORT=3003': `PORT=${port}`,
  '3003': port,
  'PRICE_USDC=1.00': `PRICE_USDC=${price}`,
  'PRICE_USDC:-1.00': `PRICE_USDC:-${price}`,
  '\\$1\\.00 USDC': `\\$${price} USDC`,
};

try {
  console.log('📋 Copying template files...');
  copyDir(templateDir, targetDir, replacements);

  console.log(`✅ Service ${serviceName} generated successfully!`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. Implement service logic in: examples/${serviceName}/src/services/`);
  console.log(`2. Update README with specific API details`);
  console.log(`3. Run: cd examples/${serviceName} && npm install && npm run build`);
  console.log(`4. Test the service: npm run dev`);
} catch (error) {
  console.error('❌ Error generating service:', error.message);
  process.exit(1);
}
