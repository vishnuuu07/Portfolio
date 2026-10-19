import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const sections = ['experience', 'research', 'approach', 'freelance', 'foundations', 'contact'];

async function jump(page: Page, id: string, offset = 110) {
  // Exercise the same anchor mapping as real navigation, including the two
  // content holds; native DOM offsets are not master-scroll coordinates.
  void offset;
  await expect(page.locator('html')).toHaveAttribute('data-motion-ready','true');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(id => {
    const anchor=document.createElement('a');anchor.href=`#${id}`;
    document.body.appendChild(anchor);anchor.click();anchor.remove();
  },id);
  await expect(page.locator('html')).not.toHaveAttribute('data-navigating', /.+/, {timeout:6000});
}

test('server content, real assets, resume and verified contact', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Engineering judgment, amplified.' })).toBeVisible();
  for (const id of sections) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator('a[href="mailto:vishnu911ch@gmail.com"]')).toHaveCount(2);
  await expect(page.getByText('Valid through Dec 2025', { exact: true })).toBeVisible();
  await expect(page.getByText('Valid through May 2025', { exact: true })).toBeVisible();
  await page.goto('/resume');
  await expect(page.getByRole('heading', { name: 'Vishnu Chittampalli', exact: true })).toBeVisible();
  const pdf = await request.get('/resume/vishnu-chittampalli.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const icon = await request.get('/icon.svg');
  expect(icon.status()).toBe(200);
  const social = await request.get('/opengraph-image');
  expect(social.status()).toBe(200);
  expect(social.headers()['content-type']).toContain('image/png');
  expect(errors).toEqual([]);
});

test('section navigation, focus, history and direct hashes', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Experience', 'Research', 'Approach', 'Freelance']) {
    await page.getByRole('navigation').first().getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${name.toLowerCase()}$`));
    await expect(page.locator(`#${name.toLowerCase()} h2`)).toBeFocused();
  }
  await page.goBack();
  await expect(page).toHaveURL(/#approach$/);
  await page.goForward();
  await expect(page).toHaveURL(/#freelance$/);
  for (const id of ['experience', 'research']) {
    await page.goto(`/#${id}`);
    await page.waitForTimeout(350);
    const y = await page.locator(`#${id}`).evaluate(el => el.getBoundingClientRect().top);
    expect(y).toBeLessThan(250);
    expect(y).toBeGreaterThan(-200);
    await page.reload();
    await expect(page.locator(`#${id} h2`)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id === 'experience' ? 'dark' : 'light');
  }
  const historyLength = await page.evaluate(() => history.length);
  await page.keyboard.press('End');
  await page.waitForTimeout(250);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Home');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test('mobile menu supports keyboard, escape, focus return and anchor selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: /menu/i });
  await menu.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Approach', exact: true }).click();
  await expect(page).toHaveURL(/#approach$/);
  await expect(page.locator('#approach h2')).toBeFocused();
});

test('clipboard success and denial have honest states', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#research');
  await page.getByRole('button', { name: 'Copy publication link', exact: true }).click();
  await expect(page.getByText('Link copied', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://ieeexplore.ieee.org/document/10083885');
  await jump(page, 'contact');
  await page.getByRole('button', { name: 'Copy email', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('vishnu911ch@gmail.com');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Permission denied'); } } }));
  await page.getByRole('button', { name: 'Copy email', exact: true }).click();
  await expect(page.locator('input[readonly], textarea[readonly]')).toBeVisible();
});

for (const size of [{ width: 2560, height: 1440 }, { width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 780 }]) {
 test(`all chapters fit the ${size.width} ? ${size.height} viewport`,async({page})=>{
  await page.setViewportSize(size);await page.goto('/');
  for(const id of ['top',...sections]){
   await jump(page,id);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 });
}

test('reading chapters pass automated accessibility checks',async({page})=>{
 await page.goto('/');
 for(const id of ['top','experience','research','approach','freelance','foundations']){
  await jump(page,id);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 }
});

test('wide composition aligns to the viewport and scene layers remain transparent', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('/');
  await expect(page.locator('[data-portfolio-stage]')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const frame = await page.evaluate(() => {
    const heading = document.querySelector('h1')!;
    return {
      headingLeft: heading.getBoundingClientRect().left,
      wordmarkLeft: document.querySelector('.wordmark')!.getBoundingClientRect().left,
      fontSize: parseFloat(getComputedStyle(heading).fontSize),
      fontLoaded: document.fonts.check('800 100px ' + getComputedStyle(heading).fontFamily.split(',')[0]),
    };
  });
  expect(frame.headingLeft / 2560).toBeGreaterThanOrEqual(.05);
  expect(frame.headingLeft / 2560).toBeLessThanOrEqual(.07);
  expect(Math.abs(frame.headingLeft - frame.wordmarkLeft)).toBeLessThan(2);
  expect(frame.fontSize).toBeGreaterThan(180);
  expect(frame.fontLoaded).toBe(true);
  for (const id of ['experience', 'research', 'approach', 'freelance', 'foundations']) {
    await jump(page, id);
    const backgrounds = await page.locator(`#${id}, #${id} .workflow, #${id} .practical-example, #${id} .foundation-grid`).evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { color: style.backgroundColor, image: style.backgroundImage };
    }));
    expect(backgrounds.every(bg => bg.color === 'rgba(0, 0, 0, 0)' && bg.image === 'none')).toBe(true);
  }
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('content and links survive JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Engineering judgment, amplified.' })).toBeVisible();
  await page.getByRole('link', { name: /Explore my experience/ }).click();
  await expect(page).toHaveURL(/#experience$/);
  await expect(page.locator('#experience h2')).toBeVisible();
  await context.close();
});

test('motion preference persists without moving the reading position', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#contact');
  const stage = page.locator('[data-portfolio-stage]');
  await expect(stage).toHaveAttribute('data-mode', 'reduced');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: /Motion: Reduced/ }).last().scrollIntoViewIfNeeded();
  const before = await page.locator('#contact h2').evaluate(el=>el.getBoundingClientRect().top);
  await page.getByRole('button', { name: /Motion: Reduced/ }).last().click();
  await expect(stage).toHaveAttribute('data-mode', 'full');
  await expect.poll(async()=>Math.abs(await page.locator('#contact h2').evaluate(el=>el.getBoundingClientRect().top)-before)).toBeLessThan(3);
  await page.reload();
  await expect(stage).toHaveAttribute('data-mode', 'full');
  await page.getByRole('button', { name: /Motion: Full/ }).last().click();
  await expect(stage).toHaveAttribute('data-mode', 'reduced');
  await expect.poll(async()=>Math.abs(await page.locator('#contact h2').evaluate(el=>el.getBoundingClientRect().top)-before)).toBeLessThan(3);
});

test('scene comes to rest, keeps chapter themes and survives context loss', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('[data-portfolio-stage]');
  await expect(stage).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(300);
  const idle = await stage.getAttribute('data-frame-count');
  await page.waitForTimeout(700);
  expect(await stage.getAttribute('data-frame-count')).toBe(idle);
  await jump(page, 'experience-production');
  await expect(stage).toHaveAttribute('data-chapter', 'experience');
  const afterScroll = await stage.getAttribute('data-frame-count');
  expect(Number(afterScroll)).toBeGreaterThan(Number(idle));
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/scene-observation.json', JSON.stringify({
    viewport: page.viewportSize(), idleObservationMs: 700, framesBeforeIdle: Number(idle),
    framesAfterIdle: Number(idle), framesAfterScroll: Number(afterScroll),
    beamCount: await stage.getAttribute('data-beam-count'),
  }, null, 2));
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await jump(page, 'research');
  const bright = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bright).not.toBe(dark);
  await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(stage).toHaveAttribute('data-ready', 'false');
  await expect(page.locator('#research h2')).toBeVisible();
});

test('WebGL creation failure leaves the complete fallback portfolio', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page.locator('[data-portfolio-stage]')).toHaveAttribute('data-ready', 'false');
  await expect(page.locator('h1')).toBeVisible();
  await page.getByRole('link', { name: /Explore my experience/ }).click();
  await expect(page.locator('#experience h2')).toBeFocused();
});

test('capture reference chapters and responsive evidence', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.url().startsWith('http://localhost:3000/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await mkdir('test-results/screenshots', { recursive: true });
  await page.goto('/');
  await page.waitForTimeout(900);
  const captures = [
    ['hero', 'top', 0], ['orbit', 'about', 650], ['introduction', 'about', 100],
    ['experience-entry', 'experience', 310], ['transition-a', 'experience', 520], ['transition-b', 'experience', 410],
    ['applications', 'experience-applications', 120], ['integrations', 'experience-integrations', 120],
    ['production', 'experience-production', 120], ['delivery', 'experience-delivery', 120], ['research', 'research', 110],
    ['approach', 'approach', 110], ['freelance', 'freelance', 110], ['foundations', 'foundations', 110], ['contact', 'contact', 110],
  ] as const;
  for (const [name, id, offset] of captures) {
    await jump(page, id, offset);
    await page.screenshot({ path: `test-results/screenshots/desktop-${name}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['top', 'experience', 'research', 'approach', 'foundations', 'contact']) {
    await jump(page, id, id === 'top' ? 0 : id === 'contact' ? 80 : 100);
    await page.screenshot({ path: `test-results/screenshots/mobile-${id}.png` });
  }
  expect(errors).toEqual([]);
});

test('reading destinations and terminal contact clear the measured header',async({page})=>{
 test.setTimeout(90_000);
 for(const viewport of [{width:2560,height:1317},{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion-ready','true');
  for(const id of ['experience','research','contact']){
   await jump(page,id);
   const bounds=await page.evaluate(id=>({header:document.querySelector('.site-header')!.getBoundingClientRect().bottom,heading:document.querySelector(`#${id} h2`)!.getBoundingClientRect().top}),id);
   expect(bounds.heading).toBeGreaterThanOrEqual(bounds.header+16);
  }
  await page.keyboard.press('End');
  await expect.poll(async()=>page.evaluate(()=>document.querySelector('#contact h2')!.getBoundingClientRect().top)).toBeGreaterThanOrEqual(104);
  const end=await page.evaluate(()=>({y:scrollY,max:document.documentElement.scrollHeight-innerHeight,footer:document.querySelector('.site-footer')!.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}));
  expect(Math.abs(end.y-end.max)).toBeLessThan(1);expect(end.footer).toBeLessThanOrEqual(viewport.height);expect(end.overflow).toBe(false);
 }
});

test('navigation traverses native states, cancels promptly and replaces its destination',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-motion-ready','true');
 await page.getByRole('navigation').first().getByRole('link',{name:'Freelance',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-navigating','freelance');
 const before=await page.evaluate(()=>scrollY);await page.waitForTimeout(260);
 const during=await page.evaluate(()=>({y:scrollY,content:Number(document.querySelector<HTMLElement>('[data-portfolio-stage]')!.dataset.contentOffset),chapter:document.documentElement.dataset.chapter}));
 expect(during.y).toBeGreaterThan(before);expect(during.content).toBeGreaterThan(0);expect(during.chapter).not.toBe('freelance');
 await page.mouse.wheel(0,150);await expect(page.locator('html')).not.toHaveAttribute('data-navigating',/.+/);
 await page.waitForTimeout(150);const canceled=await page.evaluate(()=>scrollY);await page.waitForTimeout(350);
 expect(Math.abs(await page.evaluate(()=>scrollY)-canceled)).toBeLessThan(2);
 await expect(page.locator('#freelance h2')).not.toBeFocused();
 await page.getByRole('navigation').first().getByRole('link',{name:'Freelance',exact:true}).click();await page.waitForTimeout(200);
 await page.getByRole('navigation').first().getByRole('link',{name:'Research',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-navigating','research');
 await expect(page.locator('#research h2')).toBeFocused();await expect(page.locator('#freelance h2')).not.toBeFocused();
 await expect(page.locator('html')).not.toHaveAttribute('data-navigating',/.+/);
});

test('reset two holds the complete final block without contact while the canvas progresses',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-motion-ready','true');
 const stage=page.locator('[data-portfolio-stage]');
 await expect(stage).toHaveAttribute('data-ready','true');
 await expect(stage).toHaveAttribute('data-frame-count',/^[1-9]\d*$/);
 const result=await page.evaluate(async()=>{
  const stage=document.querySelector<HTMLElement>('[data-portfolio-stage]')!;
  const seek=async(y:number)=>{scrollTo({top:y,behavior:'instant'});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);};
  const max=document.documentElement.scrollHeight-innerHeight,positions=[];
  for(let y=0;y<max;y+=160){await seek(y);if(stage.dataset.phase==='reset-2')positions.push(y);}
  if(positions.length<2)throw new Error('The measured timeline must contain a second reset');
  const start=positions[0],end=positions[positions.length-1],snapshots=[];
  for(const fraction of [0,.5,1]){
   await seek(start+(end-start)*fraction);
   const block=document.getElementById('credentials')!.getBoundingClientRect(),contact=document.querySelector('#contact h2')!.getBoundingClientRect();
   snapshots.push({top:block.top,bottom:block.bottom,contact:contact.top,header:document.querySelector('.site-header')!.getBoundingClientRect().bottom,frames:Number(stage.dataset.frameCount),content:Number(stage.dataset.contentOffset)});
  }
  return {snapshots,height:innerHeight};
 });
 for(const snapshot of result.snapshots){expect(snapshot.top).toBeGreaterThan(snapshot.header+16);expect(snapshot.bottom).toBeLessThan(result.height);expect(snapshot.contact).toBeGreaterThan(result.height);}
 expect(Math.max(...result.snapshots.map(s=>s.top))-Math.min(...result.snapshots.map(s=>s.top))).toBeLessThan(1);
 expect(result.snapshots[2].frames).toBeGreaterThan(result.snapshots[0].frames);
 expect(result.snapshots[0].content).toBe(result.snapshots[2].content);
});
