# Pages marketing asset budget

The original 1672×941 key-art PNG is preserved under
`art-source/marketing/rooster-rage-key-art-master.png` (2317088 bytes).
It previously lived in `public/marketing/`, so Vite copied it into every
Pages package. With the new enemy art this exceeded the 21 MiB Pages gate.

Pages now serves `public/marketing/rooster-rage-social.jpg`, a 1200×675 JPEG
(264625 bytes). Open Graph points to that version. Game-only release builds
continue to omit all marketing files. No package budget or gameplay setting
was changed.

Reproduce the web export with:

```powershell
ffmpeg -y -v error -i art-source/marketing/rooster-rage-key-art-master.png -vf scale=1200:-1:flags=lanczos -q:v 3 -update 1 public/marketing/rooster-rage-social.jpg
```

`npm run test:pages` verifies the repository-prefixed Pages package and its
portal iframe. `npm run package:kongregate` verifies the separate game build.

The Pages workflow resolves one master commit before building. Its main game
and `/kongregate/` preview both check out that exact commit, rather than mixing
master with an older upload branch. Both publish `build-info.json`; deployment
also rejects mismatched source revisions. The upload branch still carries the
downloadable split package, but cannot silently select older preview code.
