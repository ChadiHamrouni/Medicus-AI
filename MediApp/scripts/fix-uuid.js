#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing UUID compatibility issues...');

// Function to recursively find and fix UUID issues
function fixUuidInDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (
      stat.isDirectory() &&
      item !== '.git' &&
      item !== 'dist' &&
      item !== 'builds'
    ) {
      fixUuidInDirectory(itemPath);
    } else if (item === 'package.json') {
      try {
        const packageData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
        let modified = false;

        // Fix dependencies
        if (packageData.dependencies && packageData.dependencies.uuid) {
          if (
            packageData.dependencies.uuid.startsWith('^3.') ||
            packageData.dependencies.uuid.startsWith('3.')
          ) {
            console.log(`📦 Updating UUID in ${itemPath}`);
            packageData.dependencies.uuid = '^9.0.0';
            modified = true;
          }
        }

        // Fix devDependencies
        if (packageData.devDependencies && packageData.devDependencies.uuid) {
          if (
            packageData.devDependencies.uuid.startsWith('^3.') ||
            packageData.devDependencies.uuid.startsWith('3.')
          ) {
            console.log(`📦 Updating UUID in devDependencies ${itemPath}`);
            packageData.devDependencies.uuid = '^9.0.0';
            modified = true;
          }
        }

        if (modified) {
          fs.writeFileSync(itemPath, JSON.stringify(packageData, null, 2));
          console.log(`✅ Fixed UUID version in ${itemPath}`);
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }
  }
}

// Fix node_modules for any packages with old UUID versions
fixUuidInDirectory('node_modules');

console.log('🎉 UUID fix completed!');
