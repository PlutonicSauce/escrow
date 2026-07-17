# Escrow demo fixtures

`sample-monorepo/` is a tracked, verified pnpm workspace. The GitHub Actions
workflow checks this fixture and must pass. Create a disposable committed copy
when using the local UI:

```bash
npm run demo:reset
escrow ui .escrow-demo/sample-monorepo --model gpt-5.6-luna --execute
```

The reset command deletes and recreates only `.escrow-demo/`, which is ignored
by Git. Run it again after any applied change to restore the verified baseline.
The Escrow source checkout remains unchanged.
