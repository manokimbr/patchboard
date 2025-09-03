# ADD Awareness (Frontend)

This tool scans `/src` and outputs:
- `ADD/memory/frontendMemory.json`: components, tags, imports, props, emits, env.
- `ADD/memory/structure.json`: file tree summary.

Vuetify-aware: if `plugins/vuetify.(js|ts)` is present, it checks registration vs usage and flags missing components.

Run: `npm run brain`
