# Validation record

Completed locally on 19 October 2026 with Windows, Node.js 22.23.0, npm 11.17.0, Next.js 16.4.2, React 19.3.1, Three.js 0.186.1, React Three Fiber 9.8.2, and GSAP 3.15.0.

## Build and dependency checks

- `npm ci`: clean reinstall from the delivered lockfile succeeded without force or legacy peer flags.
- `npm run typecheck`: passed.
- `npm run lint`: passed using configured ESLint; generated browser output is excluded.
- `npm test`: 10 timeline tests passed.
- `npm run build`: passed; `/`, `/resume`, `/icon.svg`, and `/opengraph-image` are statically prerendered. The build generated the actual two-page PDF.
- `npm run start`: production server started successfully at http://localhost:3000.
- `npm audit --omit=dev`: zero production dependency vulnerabilities at validation time.

The full development dependency audit reports five high-severity entries from the same `braces` stack-exhaustion advisory propagated through `micromatch` and the Next ESLint tooling. The registry offered no patched `braces` release at implementation time; npm's proposed automatic remedy was a major downgrade of `eslint-config-next` to an incompatible framework generation. No forced downgrade or advisory suppression was applied. See `test-results/dependency-audit.json` after the recorded local audit. This is a development lint-tooling dependency, not a runtime portfolio dependency.

## Browser checks

The complete 10-test Playwright suite passed against the final production build. Subsequently enhanced real clipboard and scene-observation assertions also passed in targeted production runs.

- All desktop navigation links, destination heading focus, direct experience/research hashes, refresh at those hashes, Back/Forward, Home/End, and no history growth from ordinary scrolling.
- Mobile menu opening, native modal focus containment, Escape, return focus to the trigger, and selected-link focus to the destination.
- Real browser clipboard writes/readback for the exact IEEE URL and confirmed email; deterministic permission-denial simulation exposes selectable text.
- Matching HTML resume, actual PDF response and signature, favicon response, and PNG Open Graph response.
- No horizontal overflow across 1440×900, 1280×720, 768×1024, 390×844, and 360×780, checked through every substantive section.
- Axe WCAG 2 A/AA and WCAG 2.1 AA checks reported no violations at opening, two intermediate enterprise lighting positions, experience, research, and foundations. These are automated checks, not a claim of formal WCAG certification.
- Core portfolio, anchor navigation, and Approach content with JavaScript disabled.
- OS reduced-motion initialization, stationary fallback with no canvas, explicit preference switching and persistence after reload, and unchanged scroll position when switching a visible motion control.
- Simulated WebGL creation failure and real `WEBGL_lose_context` handling both leave readable content and working navigation.
- Production screenshot pass recorded no page exceptions, console errors, or failed local asset responses.

Desktop screenshots cover the joined V, orbit, introduction, enterprise entry and production evidence, two lighting-transition samples, bright research, Approach, foundations, and contact. Phone captures cover hero, experience, research, Approach, foundations, and contact. They are in `test-results/screenshots/`. A separate independent visual evaluator inspected laptop/tablet/phone layouts, menu behavior, intermediate themes, and the complete content; its second review passed after footer clipping and progress overlap fixes. Only models from the available provider were accessible, so this was an independent same-provider review rather than a cross-provider review.

## Graphics observations

At 1440×900, the scene's render counter remained at **2** through a **700 ms** idle observation; a subsequent scroll jump advanced it to **3**. The stage reports two shared-geometry beams. The measurements are recorded in `test-results/scene-observation.json`. Rendering therefore resumes for a changed scene state and stops while that state rests. This observation does not establish a hardware-wide FPS claim. Frame-time distributions, thermal behavior, and mobile GPU performance were not measured on physical devices.

The scene uses one demand-rendered canvas, two rigid beam meshes, a neutral shadow floor, one shadow-casting key light, inexpensive fill/rim lighting, bounded DPR, a 1024 shadow map on desktop, and disabled mobile shadows. Hidden-tab and mobile reading-band rendering have explicit pause/listener cleanup paths. Mobile reserves illustrations for opening/separation and the closing V; it hides the stage during substantive reading so beams never sit behind body text. The enterprise environment still changes normally.

Three.js emits an upstream `THREE.Clock` deprecation warning when React Three Fiber constructs its internal clock. The application does not instantiate a Clock, and the selected current compatible Fiber release still does so internally. This is a warning rather than a runtime error; no console-warning monkeypatch was added.

## Resume and content checks

The PDF was rendered to PNG with PDFium and every page visually inspected after the final layout change. It is two pages, has five clickable link annotations, and contains the authoritative email and both historical validity dates. The PDF has compact summaries of enterprise prose plus every evidence bullet; the portfolio and HTML resume retain the complete approved bodies. Profile, portfolio, resume, PDF, structured data, and contact actions derive from `lib/profile.ts`.

Publication and credential destinations retain the exact approved URLs. External IEEE/Credly metadata and remote availability were not independently revalidated; no conference name, abstract detail, result, active-certification claim, public Filostech demo, or GitHub profile was invented.

## Remaining limits

Lighting/materials are an economical real-time interpretation of the studio concepts. They are smoother than the reference renders; text-safe backings can soften the traveling beam at decorative margins, and intermediate chapter backdrops can show the boundary between cream and wine reading surfaces. These preserve reading contrast and do not hide content. The final visual review found no blocking layout issues.

Validation used local Chrome 154 and viewport emulation. Safari/iOS hardware, other browser engines, physical touch GPUs, a live Vercel deployment, and a real custom domain were not tested. No domain, paid resource, or deployment was created. Exact Vercel import steps and the optional site-origin setting are in `README.md`.
