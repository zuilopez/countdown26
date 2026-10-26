# CTD — Countdown + D-Work · v0.4

Live on Vercel: https://ctd-luiz.vercel.app (project `countdown`).

- `index.html` — page: V94-style header (view icons | page name + optional symbol | version · EN/VI · menu dot), 4 priority lanes P1–P4 + Done archive, 3-frame and list views, footer with date/time, red glow, heatwave, scan grid, solid + image background, dark/light mode, digital countdown (font DSEG7 Classic, OFL-1.1, embedded). The red dot opens the V94-style CUSTOM panel with Save / Load / Reset (presets, copy/paste settings). Settings in localStorage `ctd_ui_v4`.
- `api/dwork.js` — Notion D-Work API: GET list, POST create, PATCH edit incl. start date `Bắt đầu` (finishing a repeating task reschedules it), DELETE → Notion trash. Env: `NOTION_TOKEN`, `CTD_PASSWORD`.
- `slides/` — slide images, listed in `slides/manifest.json`.
- `dwork-ui.js` — old D-Work panel, no longer loaded.

## Changelog
- v0.4 — Digital (DSEG7) countdown: big one for the next deadline + one per card (time → live clock, date → days); deadlines can carry a time; FX on/off button in header; effects reduced to heatwave + scan with colour and settings; footer line and glow removed; CUSTOM panel: neutral nav, mica sliders always on top (opacity, blur, saturation, tint) shared with board panels, Import button; letter spacing up to 40px; tilt removed.
- v0.3 — Dark/light switch in the header; FPS removed; Done stat + option to stack stats on the left; Done is a collapsible 5th column after P4; check circle to complete (click again to undo), level change by drag or in Edit; lighter cards without inner borders, Notion link removed; Tracking map (week/month) — drag a bar to move it, drag its ends for start/deadline, click a day to date an undated task. New Notion column `Bắt đầu` (start date).
- v0.2 — V94 CUSTOM panel back (Header / Background / Board / Effects) with AR-style Save · Load · Reset; page name text + font + symbol image; background solid + image (slides, upload, link) with mix/opacity/blur; V94 heatwave values; scan grid; coloured stats; macOS-grey light mode; logo removed.
- v0.1 — Restored V94 header/footer, page-name font, heatwave + recolourable footer glow, EN/VI switch (EN default), lanes follow Notion levels P1–P4, add/edit/delete tasks from the page.
