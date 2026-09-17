import { chromium } from 'playwright';
for (const cfg of [{ name: 'new-headless+gpu', opts: { channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] } }]) {
  try {
    const b = await chromium.launch(cfg.opts);
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('https://landonorris.com/', { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 6000));
    const gl = await p.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none'; });
    const times = [];
    for (let i = 0; i < 5; i++) { const t = Date.now(); await p.screenshot({ timeout: 60000, animations: 'allow' }); times.push(Date.now() - t); }
    console.log(cfg.name, 'renderer:', gl, 'screenshot ms:', times.join(','));
    await b.close();
  } catch (e) { console.log(cfg.name, 'failed:', e.message.split('\n')[0]); }
}
