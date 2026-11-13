# Contributing

- **Branches:** `feat/<short-name>` for features, `fix/<short-name>` for bug fixes.
- **One feature per branch.** Keep changes small and focused.
- **Pull requests** go into `main`.
- **Before pushing**, run `npm run lint` and `npm run build`. Both must pass.
- **Never commit `.env`.** Add new variables to `.env.example` instead.
- **Use npm only.** Commit `package-lock.json`; never add a `yarn.lock` or `pnpm-lock.yaml`.
