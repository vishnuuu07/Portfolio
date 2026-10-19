# Kinetic Index — Vishnu Chittampalli

A complete editorial portfolio: semantic, server-rendered content with a decorative two-beam Three.js scene, native scrolling, a single enterprise lighting chapter, accessible motion controls, and matching HTML/PDF resumes.

## Run locally

Use **Node.js 22.x** and npm. Dependency versions are pinned in `package.json` and `package-lock.json`; installation does not need peer-dependency overrides.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For the production application:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

The build regenerates `public/resume/vishnu-chittampalli.pdf` from the same data used by the website. `/resume` provides readable, printable HTML and the real PDF download. Fonts and their open licenses are bundled under `public/fonts`; no font CDN or remote asset fetch is needed at build time or runtime.

## Deploy to Vercel

1. Push this directory, including `package-lock.json`, `public/fonts`, and `public/resume`, to a Git repository. Exclude `.next`, `node_modules`, `.env.local`, and test output.
2. In Vercel choose **Add New → Project → Import Git Repository** and select that repository.
3. Set the root directory to this application directory, the framework preset to **Next.js**, and Node.js to **22.x**. Use `npm ci` as the install command and `npm run build` as the build command. Leave the output-directory setting at the framework default.
4. Optionally add `NEXT_PUBLIC_SITE_ORIGIN` as the exact HTTPS origin assigned to the project, without a path, and redeploy. Without it, the application omits an invented canonical origin.
5. Deploy and check `/`, direct `/#experience` and `/#research` links, `/resume`, and `/resume/vishnu-chittampalli.pdf` on the assigned URL.

No database, account system, mail provider, runtime AI integration, secrets, or paid resources are required. Get in touch uses the visitor's mail client; copy-email provides an alternative. No deployment has been performed as part of this local implementation.

## Content and contact maintenance

Edit `lib/profile.ts` to change the public name, email, employer dates, evidence, publication, project, education, credential dates, or URLs. `profile.email` is the single authoritative public contact field. Run `npm run resume:generate` after changing data, or run the complete build. Keep historical credential validity dates visible; they are not current-certification claims.

The IEEE summary intentionally uses the approved conservative wording. Publisher author order, abstract, datasets, results, and credential status have not been inferred. No public Filostech demo or repository is represented.

## Scene and motion

The decorative scene lives in `components/scene`; authorable transforms live in `components/scene/scene-config.ts`. `lib/motion` measures semantic document sections and evaluates a shared state for geometry, camera, and lighting. Edit keyframes rather than adding separate competing animation loops. Exactly two beam meshes share fixed geometry dimensions; the floor and lights complete the studio. The camera and quaternion interpolation provide perspective changes without scaling the beams.

The experience chapter alone receives sustained wine lighting. Research, Approach, freelance, foundations, and contact return to cream. The scene uses demand rendering, bounded pixel density and shadows, and no idle spinning or postprocessing. Decorative rendering never gates the HTML content.

Motion initially follows the operating-system preference. An explicit choice is stored locally and can be changed in the footer or mobile menu. Reduced motion uses stationary compositions and immediate chapter theme changes. If JavaScript or WebGL is unavailable, or a graphics context is lost, a static two-beam illustration remains with the complete readable content. The menu, anchor focus, history behavior, and clipboard controls are progressive enhancements over ordinary links and visible contact details.

## Validation

```sh
npm test
npm run test:browser
```

Browser tests use Playwright against a production server. Install its Chromium with `npx playwright install chromium` if necessary, or set `CHROME_PATH` to a Chrome executable. On this development machine the configuration also detects the installed agent-browser Chrome. Test output, screenshots, traces on failure, and the HTML report are written under `test-results/` and excluded from source control.

The timeline suite exercises boundaries, reversibility, invariant geometry, and chapter lighting. Browser coverage includes navigation and focus, history, direct hashes and reloads, clipboard success and failure, mobile menu keyboard behavior, real asset responses, no-JavaScript content, responsive overflow, and axe accessibility checks. Reference screenshots include desktop and phone chapters plus intermediate lighting states.

Actual execution results and remaining limitations are recorded in `VALIDATION.md` after testing. Browser observations are specific to the available local Chrome and graphics environment; no universal FPS or device-performance guarantee is implied. Lighting is implemented with economical real-time geometry and shadows and will differ from the supplied studio-rendered concepts.

Implementation references: [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying), [Vercel Next.js support](https://vercel.com/docs/frameworks/full-stack/nextjs), [React Three Fiber demand rendering](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
