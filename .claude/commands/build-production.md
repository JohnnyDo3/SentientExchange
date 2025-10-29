---
name: build-production
description: Production-ready build with all quality checks
---

Execute the complete production build pipeline:

1. **Clean build artifacts**
   - Remove dist/ directory
   - Clear node_modules/.cache if it exists

2. **TypeScript compilation**
   - Run `npm run build` with strict mode
   - Ensure zero TypeScript errors

3. **Code quality checks**
   - Run ESLint with `--max-warnings 0`
   - Run Prettier check to ensure formatting

4. **Testing**
   - Run all Jest tests with coverage
   - Ensure minimum 80% coverage threshold
   - Generate HTML coverage report in coverage/

5. **Security audit**
   - Run `npm audit` and report vulnerabilities
   - Fail if any high or critical vulnerabilities found

6. **Build verification**
   - Verify dist/ contains all necessary files
   - Check that index.js is executable
   - Generate build manifest with version and timestamp

7. **Bundle analysis**
   - Report bundle sizes
   - Check for any suspiciously large files
   - Verify source maps are generated

8. **Final summary**
   - Display build time
   - Show file sizes
   - Report any warnings or issues
   - Display success message with next steps

If any step fails, stop immediately and report the error with suggestions to fix it.
