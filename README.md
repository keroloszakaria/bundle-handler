# Bundle Handler 🛠️

A fast and simple CLI tool for analyzing, cleaning, formatting, and bundling JavaScript/TypeScript files.

## 🚀 Features

- 📊 **Analyze** – Detect packages, usage stats, and file info
- 🗑️ **Remove** – Remove packages safely or forcefully from files
- ✨ **Format / Minify** – Format with Prettier or minify with Terser
- 📦 **Bundle** – Create browser-ready bundles using **esbuild**
- 🔍 **Force Mode** – Handle bundled/minified files with deep scanning

---

## 📦 Installation

### Global (Recommended)

```bash
npm install -g bundle-handler
```

### Local

```bash
npm install bundle-handler
```

### From Source

```bash
git clone https://github.com/yourusername/bundle-handler.git
cd bundle-handler
npm install
npm run install-global
```

---

## 🛠️ Usage

### Analyze Files 📊

```bash
# Analyze a file
kz analyze myfile.js
```

**Example Output:**

```
📄 File: myfile.js
📏 Lines: 14,056
💾 Size: 5436.96 KB
📦 Packages detected: 8
  - jquery v3.7.1 (252 times)
  - moment v2.30.1 (43 times)
🏆 Most used: jquery
📊 Total references: 321
```

---

### Remove Packages 🗑️

```bash
# Normal removal
kz remove myfile.js moment

# Force removal (minified/bundled files)
kz remove myfile.js moment --force
```

✅ **Normal Mode**: Precise AST parsing  
⚡ **Force Mode**: Aggressive regex-based removal

---

### Format & Minify ✨

```bash
# Format with Prettier
kz format myfile.js

# Minify with Terser
kz format myfile.js --minify
```

---

### Bundle Packages 📦

```bash
# Create a vendor bundle
kz bundle jquery moment lodash

# Custom output
kz bundle jquery moment --out vendor.js

# Minified bundle
kz bundle jquery moment --minify
```

---

## 🔖 Commands

| Command                      | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `kz analyze <file>`          | Analyze JS/TS file for package usage                |
| `kz remove <file> <package>` | Remove a package (use `--force` for minified files) |
| `kz format <file>`           | Format with Prettier (add `--minify` for Terser)    |
| `kz bundle [packages...]`    | Bundle npm packages into one file                   |

---

## ⚙️ Configuration

- Respects your **Prettier** config (`.prettierrc`, `prettier.config.js`, or `package.json`)
- Default settings if no config found:

```json
{
  "parser": "babel",
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## 🐛 Troubleshooting

- **Package not found** → Run `npm install <package>`
- **AST parsing fails** → Use `--force`
- **Permission issues** → Check file permissions
- **Large files** → Use `--max-old-space-size=4096`

Enable debug mode:

```bash
DEBUG=kz kz analyze myfile.js
```

---

## 👩‍💻 Contributing

1. Fork & clone
2. Create a branch
3. Make changes + add tests
4. Submit PR

Local setup:

```bash
git clone https://github.com/yourusername/bundle-handler.git
cd bundle-handler
npm install
npm link
```

---

## 📜 License

MIT License – see [LICENSE](LICENSE)

---

Made with ❤️ for the JavaScript community
