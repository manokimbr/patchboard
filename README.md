# 🩹 Patchboard

> Frontend boilerplate aligned with the Automox stack — Vue 3 + Vite + TypeScript + Cypress — with an extra layer of **Awareness-Driven Development (ADD)** to keep the codebase introspective and maintainable.

---

## ⚙️ Stack

- [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) — fast DX, modern bundling  
- [TypeScript](https://www.typescriptlang.org/) — strict mode, IDE-friendly  
- [Cypress](https://www.cypress.io/) — end-to-end testing, already bootstrapped  
- [Vuetify](https://vuetifyjs.com/) (optional) — UI dojo, with automatic detection hooks in the ADD brain  

---

## 🧠 Awareness-Driven Development (ADD)

The **ADD brain** (`ADD/brain.ts`) scans the project and generates insights into:

- 📂 Project structure (JSON + ASCII tree)  
- ⏱️ Scan timestamps + duration  
- 📝 TypeScript hygiene score (detects `any`, `@ts-ignore`, `!!`, etc.)  
- 📦 Vue SFC typing (`defineProps<T>`, `script setup lang="ts"`)  
- ⚡ Perf signals (`dynamic import()`, `IntersectionObserver`, etc.)  
- 🎨 Vuetify usage detection  
- 🔍 Self-scan of the brain itself (lines, size, TODOs)  

Run it with:

```bash
npm run brain
