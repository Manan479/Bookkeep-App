# DSH shell failure on this machine — RESOLVED

**Status: fixed. The shell tool now works.**

A later session ran `Get-Location` and `node --version` successfully on the first try, after the file policy
for the session was changed to `danger-full-access`. The same session then ran the whole test suite and got
`All good: 318 checks passed, 34 files loaded`. Nothing about the project changed in between; the failure was
in how DSH launched its shell child process, and that has since been corrected.

**So the workaround below is obsolete, and the "the agent cannot execute anything" rule is gone.** Run the
tests directly. `CHECK.bat` remains, because the user prefers a double-click and it is harmless.

What was not established is *which* change fixed it — the file policy, a DSH update, or a reboot — because
the working state was only ever observed after the fact. The notes below are kept as the record of the
symptom, in case it returns.

---

Recorded while trying to work on the bookkeep project. Nothing here is about bookkeep; it is about the
harness failing to start a process.

## Symptom

Every command fails identically, with no output:

```
[exit code: 3221225794]
```

`3221225794` = `0xC0000142` = `STATUS_DLL_INIT_FAILED`, raised by the Windows loader **before the command
line is parsed**. So this is not about the command, the working directory, or the workspace.

## What has been ruled out

| Test | Result | Ruled out |
|---|---|---|
| `Write-Output "hello"` | same failure | The command itself |
| After a DSH restart | same failure | Stale process |
| `workspace-write` vs `danger-full-access` | identical | The file sandbox |
| `C:\Program Files\PowerShell\7\pwsh.exe` exists | yes | Missing binary |
| **User double-clicks `pwsh.exe` in Explorer** | **opens normally** | PowerShell itself, and Tiny11 stripping its dependencies |
| `load_workspace_dependencies` | reports node 24.21.0, python 3.12.14, jsdom 27.4.0 | DSH's bundled runtimes |
| A `.bat` run from Explorer launches `node` successfully | yes | The machine being unable to start processes at all |

## Conclusion

PowerShell 7 starts fine when Windows launches it, and **fails specifically when DSH launches it**.
DSH's own bundled `node` runs, so the failure is specific to how DSH spawns its shell child process,
not to the system's ability to start processes and not to a missing runtime.

This is therefore a DSH defect on this machine, most likely interacting with its Windows
process-confinement layer (`0xC0000142` is a classic symptom of a restricted token or job object that
prevents a process from loading its dependencies).

## What was tried

- Reading DSH's own source: not possible. It ships inside an Electron `app.asar` archive, and the
  unpacked directory contains only vendored binaries (LibreOffice, koffi). `rg` cannot read inside the
  archive.
- No configured shell path exists in any `~/.dsh` JSON file, so DSH takes `pwsh` from defaults.
- Subagents and the workflow tool cannot help: they cannot spawn processes either.

## Workaround that was used while it was broken

`CHECK.bat` in the bookkeep project, double-clicked from Explorer, which runs `node tests\run.js` with the
full path to the bundled Node and pauses. `RUN-TESTS.bat` did the same thing but opened a generated browser
page; that one was a dead end, because Chrome blocks a `file://` page from reading local files, so it was
never the right answer.

## What to report

> On this Windows 11 machine (a third-party "Tiny11" image), every command in the shell tool fails with
> exit code `3221225794` (`0xC0000142`, `STATUS_DLL_INIT_FAILED`), identical in `workspace-write` and
> `danger-full-access`. `C:\Program Files\PowerShell\7\pwsh.exe` starts normally when double-clicked in
> Explorer, and DSH's bundled `node.exe` runs fine when launched from a `.bat`, so the system can start
> processes. Only DSH's own spawn of `pwsh` fails.

A reboot has not been tried yet. It is plausible a pending file replacement is involved, since the
failure has been present from the first command after installation, but the Explorer result argues
against a broken or half-installed PowerShell.
