The first related-suite helper invocation stopped before starting tests because
the isolated PATH does not contain `rg` (`spawnSync rg ENOENT`). The existing
bundled executable was located at
`/Applications/ChatGPT.app/Contents/Resources/codex-cli/codex-path/rg`.
Only the validation helper was changed to use that absolute path. No install,
system configuration, production or test source change was made. Focused
smoke/red/green results were already complete and remain unchanged.

The related and race phase names are `adapter-current-full-related` and
`adapter-current-focused-race`. The race call uses `-count=1` (the unmodified
build.sh also supplies `-count=1`), with `ImageOCR|ResolveModelConfig|Upload`.
