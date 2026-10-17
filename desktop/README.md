# Desktop version (not built yet)

Plan: reuse `../web`. Two routes:

1. **Quick:** wrap `../web` in Tauri or Electron. Same screens, runs on Windows, Mac and Linux. Data starts separate from
   the phone, so move it with backup and restore (see `../docs/SYNC.md`).
2. **Proper:** rebuild on a shared codebase with a real database, as described in `../docs/ROADMAP.md`. The desktop
   screens then sit on the same core logic and sync as Android.

Nothing is needed here until one of these is chosen.
