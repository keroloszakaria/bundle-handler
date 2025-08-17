import fs from 'fs';
import chalk from 'chalk';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generatorModule from '@babel/generator';

const traverse = traverseModule.default;
const generate = generatorModule.default;

/**
 * Remove a package from a file.
 * @param {string} filePath - Path to file.
 * @param {string} packageName - Name of package.
 * @param {boolean} force - If true, use deep AST & regex removal for minified/bundled files.
 * @param {boolean} aggressive - If true, use aggressive patterns (may break code).
 */
export async function removePackageFromFile(
  filePath,
  packageName,
  force = false,
  aggressive = false,
) {
  try {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const originalCode = fs.readFileSync(filePath, 'utf8');
    const originalSize = originalCode.length;
    let code = originalCode;
    let removed = false;
    let removedCount = 0;

    if (force) {
      console.log(chalk.blue(`🔍 Force mode enabled — deep scanning for '${packageName}'...`));

      // Create backup before force removal
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(chalk.gray(`📋 Backup created: ${backupPath}`));

      // First try AST approach for force mode (more conservative)
      try {
        const ast = parse(code, {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'typescript', 'dynamicImport'],
          allowImportExportEverywhere: true,
          allowAwaitOutsideFunction: true,
          allowReturnOutsideFunction: true,
          allowUndeclaredExports: true,
          errorRecovery: true,
        });

        // Collect nodes to remove
        const nodesToRemove = [];

        traverse(ast, {
          enter(path) {
            let shouldRemove = false;

            // Check import declarations
            if (path.isImportDeclaration() && path.node.source.value.includes(packageName)) {
              shouldRemove = true;
            }

            // Check require calls
            if (
              path.isCallExpression() &&
              path.node.callee.name === 'require' &&
              path.node.arguments[0] &&
              path.node.arguments[0].value &&
              path.node.arguments[0].value.includes(packageName)
            ) {
              shouldRemove = true;
            }

            // Check variable declarations with package name
            if (
              path.isVariableDeclarator() &&
              path.node.init &&
              path.node.init.type === 'CallExpression' &&
              path.node.init.callee.name === 'require' &&
              path.node.init.arguments[0] &&
              path.node.init.arguments[0].value &&
              path.node.init.arguments[0].value.includes(packageName)
            ) {
              shouldRemove = true;
            }

            if (shouldRemove) {
              nodesToRemove.push(path);
              removed = true;
              removedCount++;
            }
          },
        });

        // Remove collected nodes
        nodesToRemove.forEach((path) => {
          try {
            path.remove();
          } catch (e) {
            // Node might already be removed
          }
        });

        if (removed) {
          code = generate(ast, {
            comments: true,
            compact: false, // Keep readable format
          }).code;
        }
      } catch (astError) {
        console.warn(chalk.yellow(`⚠ AST parse failed in force mode: ${astError.message}`));
      }

      // Conservative regex patterns for force mode (only if AST didn't work)
      if (!removed) {
        console.log(chalk.blue(`🔍 Using conservative regex patterns...`));

        const conservativePatterns = [
          // Only remove specific import/require patterns, not entire lines
          new RegExp(
            `(import\\s+[^"']*from\\s+["'\`][^"'\`]*${escapeRegExp(packageName)}[^"'\`]*["'\`][\\s;]?)`,
            'gi',
          ),
          new RegExp(
            `((?:var|let|const)\\s+[^=]*=\\s*require\\s*\\(\\s*["'\`][^"'\`]*${escapeRegExp(packageName)}[^"'\`]*["'\`]\\s*\\)[\\s;]?)`,
            'gi',
          ),
          new RegExp(
            `(require\\s*\\(\\s*["'\`][^"'\`]*${escapeRegExp(packageName)}[^"'\`]*["'\`]\\s*\\))`,
            'gi',
          ),
        ];

        conservativePatterns.forEach((pattern) => {
          const beforeLength = code.length;
          code = code.replace(pattern, '/* removed $1 */');
          if (code.length !== beforeLength) {
            removed = true;
            removedCount++;
          }
        });
      }

      // Only do aggressive removal if specifically requested and conservative didn't work
      if (!removed && aggressive) {
        console.log(chalk.red(`⚠ Using AGGRESSIVE mode - this may break your code!`));

        const aggressivePatterns = [
          // Remove entire lines containing the package name
          new RegExp(`^.*${escapeRegExp(packageName)}.*$`, 'gmi'),
          // Remove quoted strings containing package name
          new RegExp(`["'\`][^"'\`]*${escapeRegExp(packageName)}[^"'\`]*["'\`]`, 'gi'),
          // Remove function calls with package name
          new RegExp(`\\b\\w*\\([^)]*${escapeRegExp(packageName)}[^)]*\\)`, 'gi'),
          // Remove object properties with package name
          new RegExp(
            `\\b\\w*\\s*:\\s*["'\`][^"'\`]*${escapeRegExp(packageName)}[^"'\`]*["'\`]`,
            'gi',
          ),
        ];

        aggressivePatterns.forEach((pattern) => {
          const beforeLength = code.length;
          code = code.replace(pattern, '');
          if (code.length !== beforeLength) {
            removed = true;
            removedCount++;
          }
        });

        // Clean up empty lines and excess whitespace
        code = code
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove multiple empty lines
          .replace(/^\s*\n/gm, '') // Remove empty lines at start
          .replace(/\s+$/gm, ''); // Remove trailing whitespace
      } else if (!removed) {
        console.log(
          chalk.yellow(
            `⚠ Conservative removal found nothing. Use --aggressive for more thorough removal.`,
          ),
        );
        console.log(chalk.gray(`💡 Tip: The package might be deeply embedded in minified code.`));

        // Restore from backup since we didn't find anything
        fs.copyFileSync(backupPath, filePath);
        fs.unlinkSync(backupPath);
        return false;
      } else {
        // Clean up backup if successful
        fs.unlinkSync(backupPath);
      }
    } else {
      // Normal AST mode
      try {
        const ast = parse(code, {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'typescript', 'dynamicImport'],
          allowImportExportEverywhere: true,
          allowAwaitOutsideFunction: true,
          allowReturnOutsideFunction: true,
          allowUndeclaredExports: true,
        });

        traverse(ast, {
          ImportDeclaration(path) {
            if (path.node.source.value === packageName) {
              path.remove();
              removed = true;
              removedCount++;
            }
          },
          CallExpression(path) {
            if (
              path.node.callee.name === 'require' &&
              path.node.arguments.length > 0 &&
              path.node.arguments[0].value === packageName
            ) {
              // Try to remove the entire statement
              const statement = path.getStatementParent();
              if (statement) {
                statement.remove();
              } else {
                path.remove();
              }
              removed = true;
              removedCount++;
            }
          },
        });

        if (removed) {
          code = generate(ast, { comments: true }).code;
        }
      } catch (parseError) {
        throw new Error(`Failed to parse JavaScript: ${parseError.message}`);
      }
    }

    if (!removed) {
      console.log(chalk.yellow(`⚠ Package '${packageName}' not found in ${filePath}`));
      return false;
    }

    // Write the modified code back
    fs.writeFileSync(filePath, code, 'utf8');

    const newSize = code.length;
    const savedBytes = originalSize - newSize;
    const savedKB = (savedBytes / 1024).toFixed(2);

    console.log(
      chalk.green(`✔ Removed ${removedCount} reference(s) to '${packageName}' from ${filePath}`),
    );
    console.log(chalk.blue(`💾 Saved ${savedKB} KB (${savedBytes} bytes)`));

    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Failed to remove package: ${err.message}`));
    return false;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
