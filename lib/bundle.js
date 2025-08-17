import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import chalk from 'chalk';
import { getPackageVersion } from './utils.js'; // دالة تجيب الإصدار

export async function bundlePackages(packages, outputFile = 'bundle.js', minify = false) {
  try {
    console.log(chalk.cyan(`📦 Preparing bundle for packages:`));
    packages.forEach((pkg) => {
      console.log(` - ${chalk.green(pkg)} (v${getPackageVersion(pkg)})`);
    });

    const tempFile = path.join(process.cwd(), '__temp_entry.js');
    const importCode = packages.map((pkg) => `import '${pkg}';`).join('\n');
    fs.writeFileSync(tempFile, importCode);

    await esbuild.build({
      entryPoints: [tempFile],
      bundle: true,
      platform: 'browser',
      outfile: outputFile,
      minify,
      format: 'iife',
      globalName: 'VendorBundle',
    });

    fs.unlinkSync(tempFile);

    console.log(chalk.green(`✔ Bundle created successfully: ${outputFile}`));
  } catch (err) {
    console.error(chalk.red(`✖ Failed to create bundle: ${err.message}`));
  }
}
