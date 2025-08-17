import fs from 'fs';
import prettier from 'prettier';
import chalk from 'chalk';
import { minify } from 'terser';

export async function formatFile(filePath, shouldMinify = false) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const originalCode = fs.readFileSync(filePath, 'utf8');
    const originalSize = originalCode.length;
    let processedCode;

    if (shouldMinify) {
      console.log(chalk.blue(`🗜️ Minifying ${filePath}...`));

      const result = await minify(originalCode, {
        compress: {
          dead_code: true,
          drop_console: false,
          drop_debugger: true,
          keep_infinity: true,
          passes: 2,
        },
        mangle: {
          toplevel: false,
          keep_fnames: false,
        },
        format: {
          beautify: false,
          comments: false,
          semicolons: true,
        },
        sourceMap: false,
        ecma: 2020,
      });

      if (result.error) {
        throw new Error(`Terser error: ${result.error}`);
      }

      processedCode = result.code;
    } else {
      console.log(chalk.blue(`✨ Formatting ${filePath}...`));

      // Try to find prettier config, fallback to defaults
      let options;
      try {
        options = await prettier.resolveConfig(filePath);
      } catch (e) {
        console.log(chalk.yellow('⚠ Could not resolve prettier config, using defaults'));
      }

      // Set default options if none found
      options = options || {
        parser: 'babel',
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        quoteProps: 'as-needed',
        trailingComma: 'es5',
        bracketSpacing: true,
        arrowParens: 'avoid',
        printWidth: 100,
      };

      // Ensure parser is set
      if (!options.parser) {
        const ext = filePath.split('.').pop().toLowerCase();
        options.parser = ext === 'ts' ? 'typescript' : 'babel';
      }

      try {
        processedCode = await prettier.format(originalCode, options);
      } catch (prettierError) {
        // Fallback to babel parser if the detected parser fails
        console.log(chalk.yellow('⚠ Parser failed, trying babel parser...'));
        options.parser = 'babel';
        processedCode = await prettier.format(originalCode, options);
      }
    }

    // Write the processed code
    fs.writeFileSync(filePath, processedCode, 'utf8');

    const newSize = processedCode.length;
    const sizeDiff = originalSize - newSize;
    const compressionRatio = ((sizeDiff / originalSize) * 100).toFixed(1);

    if (shouldMinify) {
      console.log(chalk.green(`✔ File minified successfully: ${filePath}`));
      if (sizeDiff > 0) {
        console.log(
          chalk.blue(
            `💾 Size reduced by ${(sizeDiff / 1024).toFixed(2)} KB (${compressionRatio}% compression)`,
          ),
        );
      }
      console.log(
        chalk.gray(
          `📏 Original: ${(originalSize / 1024).toFixed(2)} KB → Minified: ${(newSize / 1024).toFixed(2)} KB`,
        ),
      );
    } else {
      console.log(chalk.green(`✔ File formatted successfully: ${filePath}`));
      if (sizeDiff !== 0) {
        const change = sizeDiff > 0 ? 'reduced' : 'increased';
        console.log(chalk.blue(`📏 Size ${change} by ${Math.abs(sizeDiff)} bytes`));
      }
    }

    return true;
  } catch (err) {
    console.error(
      chalk.red(`✖ Failed to ${shouldMinify ? 'minify' : 'format'} file: ${err.message}`),
    );

    // Provide helpful suggestions
    if (err.message.includes('Unexpected token')) {
      console.log(
        chalk.yellow('💡 Tip: Make sure the file contains valid JavaScript/TypeScript syntax'),
      );
    } else if (err.message.includes('parser')) {
      console.log(
        chalk.yellow('💡 Tip: Try specifying a different parser or check file extension'),
      );
    }

    return false;
  }
}
