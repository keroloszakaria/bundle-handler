import fs from 'fs';
import path from 'path';

/**
 * Get the version of an installed package
 * @param {string} pkgName - Package name
 * @returns {string} Package version or 'N/A'
 */
export function getPackageVersion(pkgName) {
  try {
    // Skip obviously invalid package names
    if (!isLikelyPackageName(pkgName)) {
      return 'N/A';
    }

    // Handle scoped packages
    const packagePaths = [
      path.join(process.cwd(), 'node_modules', pkgName, 'package.json'),
      path.join(process.cwd(), 'node_modules', '@types', pkgName, 'package.json'),
    ];

    // Try global node_modules if local not found
    if (process.env.NODE_PATH) {
      const globalPaths = process.env.NODE_PATH.split(path.delimiter);
      globalPaths.forEach((globalPath) => {
        packagePaths.push(path.join(globalPath, pkgName, 'package.json'));
      });
    }

    for (const pkgPath of packagePaths) {
      if (fs.existsSync(pkgPath)) {
        const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkgData.version || 'N/A';
      }
    }

    // Alternative method: try to require the package and check its package.json
    try {
      const packageJsonPath = require.resolve(`${pkgName}/package.json`);
      if (fs.existsSync(packageJsonPath)) {
        const pkgData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return pkgData.version || 'N/A';
      }
    } catch (resolveError) {
      // Package not found via require.resolve
    }
  } catch (error) {
    // Failed to read package.json
  }

  return 'N/A';
}

/**
 * Check if a string looks like a real package name
 * @param {string} name - String to check
 * @returns {boolean} True if likely a package name
 */
function isLikelyPackageName(name) {
  if (!name || typeof name !== 'string') return false;

  // Quick filters for obviously invalid names
  if (name.length < 2 || name.length > 214) return false;
  if (/\s/.test(name)) return false; // No whitespace
  if (/^[0-9+\-*/=<>!&|^%(){}[\],.;:?~`#$\\]+$/.test(name)) return false; // Only symbols/numbers

  // Common known package patterns (more inclusive)
  const knownPatterns = [
    /^(jquery|lodash|moment|react|vue|angular|bootstrap|express|axios|webpack|babel|eslint)/i,
    /^@(babel|types|typescript|angular|vue|react)/,
    /\.(js|ts|css|scss|less|net)$/,
    /-(js|ts|css|scss|plugin|loader|cli|core|utils|dom|api|net|bs4|buttons|autofill|responsive)$/,
    /^(datatables|popper|util|stream|prism)/i,
  ];

  return knownPatterns.some((pattern) => pattern.test(name));
}

/**
 * Check if a file appears to be minified
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file appears minified
 */
export function isMinified(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n');
    const avgLineLength = code.length / lines.length;

    // Consider minified if average line length > 200 chars or very few lines relative to size
    return avgLineLength > 200 || (lines.length < 50 && code.length > 10000);
  } catch {
    return false;
  }
}

/**
 * Get file statistics
 * @param {string} filePath - Path to the file
 * @returns {object} File statistics
 */
export function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const code = fs.readFileSync(filePath, 'utf8');

    return {
      size: stats.size,
      sizeKB: (stats.size / 1024).toFixed(2),
      lines: code.split('\n').length,
      characters: code.length,
      lastModified: stats.mtime,
      isMinified: isMinified(filePath),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create a backup of a file before modifying it
 * @param {string} filePath - Path to the file
 * @returns {string} Path to backup file
 */
export function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup.${timestamp}`;

  try {
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}

/**
 * Validate JavaScript/TypeScript file
 * @param {string} filePath - Path to the file
 * @returns {object} Validation result
 */
export function validateJSFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');

    // Basic validation checks
    const issues = [];

    // Check for common syntax issues
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
    }

    if (openParens !== closeParens) {
      issues.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
    }

    return {
      valid: issues.length === 0,
      issues,
      size: code.length,
      lines: code.split('\n').length,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [`Failed to read file: ${error.message}`],
      size: 0,
      lines: 0,
    };
  }
}
