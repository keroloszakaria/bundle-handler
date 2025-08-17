#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeFile } from '../lib/analyze.js';
import { removePackageFromFile } from '../lib/remove.js';
import { formatFile } from '../lib/format.js';
import { bundlePackages } from '../lib/bundle.js';

const program = new Command();

program.name('jstool').description('JS Utilities CLI').version('1.0.0');

// Analyze file
program
  .command('analyze <file>')
  .description('Analyze a JS file for package usage and statistics')
  .action((file) => analyzeFile(file));

// Remove package
program
  .command('remove <file> <package>')
  .description('Remove a package from a file')
  .option('-f, --force', 'Force remove (works for bundled/minified files)')
  .option('-a, --aggressive', 'Aggressive removal (removes any reference, may break code)')
  .action(async (file, pkg, options) => {
    await removePackageFromFile(file, pkg, options.force || false, options.aggressive || false);
  });

// Format or minify
program
  .command('format <file>')
  .option('-m, --minify', 'Minify file into 1 line')
  .description('Format or minify a JS file')
  .action((file, options) => formatFile(file, options.minify));

// Bundle packages
program
  .command('bundle [packages...]')
  .option('-o, --out <output>', 'Output file name', 'bundle.js')
  .option('--minify', 'Minify the bundle', false)
  .description('Create a bundle containing the specified npm packages')
  .action((packages, options) => {
    if (!packages.length) {
      console.error('❌ You must specify at least one package.');
      process.exit(1);
    }
    bundlePackages(packages, options.out, options.minify);
  });

program.parse(process.argv);
