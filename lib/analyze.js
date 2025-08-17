import fs from 'fs';
import chalk from 'chalk';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default;

export function analyzeFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n').length;
    let allPackages = [];

    // Detect if file might be Webpack bundle (very few lines + "webpack" keywords)
    const looksLikeWebpack = lines < 100 && /webpack/i.test(code);

    try {
      if (!looksLikeWebpack) {
        // Try AST parsing
        const ast = parse(code, {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'dynamicImport'],
        });

        const imports = [];
        const requires = [];

        traverse(ast, {
          ImportDeclaration(path) {
            imports.push(path.node.source.value);
          },
          CallExpression(path) {
            if (
              path.node.callee.name === 'require' &&
              path.node.arguments.length > 0 &&
              path.node.arguments[0].type === 'StringLiteral'
            ) {
              requires.push(path.node.arguments[0].value);
            }
          },
        });

        allPackages = [...new Set([...imports, ...requires])];
      } else {
        throw new Error('Skipping AST for possible Webpack bundle');
      }
    } catch (parseErr) {
      console.warn(chalk.yellow('⚠ AST parsing failed, using regex/webpack fallback'));
      allPackages = extractPackagesWithRegex(code);

      // Extra: Try webpack module map detection
      if (looksLikeWebpack) {
        const webpackPkgs = extractWebpackModules(code);
        allPackages = [...new Set([...allPackages, ...webpackPkgs])];
      }
    }

    console.log(chalk.cyan(`📄 File: ${filePath}`));
    console.log(chalk.cyan(`📏 Lines: ${lines}`));
    console.log(chalk.yellow(`📦 Packages detected:`));

    if (allPackages.length === 0) {
      console.log(chalk.gray(' (none found)'));
    } else {
      allPackages.forEach((pkg) => console.log(' -', chalk.green(pkg)));
    }
  } catch (err) {
    console.error(chalk.red(`✖ Failed to analyze file: ${err.message}`));
  }
}

function extractPackagesWithRegex(code) {
  const importRegex = /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  const results = [];
  let match;

  const isValidPackage = (pkg) => {
    if (!pkg) return false;
    if (pkg.includes('(') || pkg.includes('+') || pkg.includes('{') || pkg.includes('}'))
      return false;
    if (pkg.length < 2) return false;
    if (/^\.\w/.test(pkg) && !pkg.startsWith('./') && !pkg.startsWith('../')) return false;
    return true;
  };

  while ((match = importRegex.exec(code)) !== null) {
    if (isValidPackage(match[1])) results.push(match[1]);
  }
  while ((match = requireRegex.exec(code)) !== null) {
    if (isValidPackage(match[1])) results.push(match[1]);
  }

  return [...new Set(results)];
}

function extractWebpackModules(code) {
  const webpackRegex = /["']\.\/node_modules\/([^"']+)["']\s*:/g;
  const results = [];
  let match;

  while ((match = webpackRegex.exec(code)) !== null) {
    let pkg = match[1];
    // Remove any trailing file path
    if (pkg.includes('/'))
      pkg = pkg.split('/')[0].startsWith('@')
        ? pkg.split('/').slice(0, 2).join('/')
        : pkg.split('/')[0];
    results.push(pkg);
  }

  return [...new Set(results)];
}
