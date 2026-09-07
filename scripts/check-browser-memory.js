// Run in the Docker image with --network none; does not start the Discord bot.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const core = require('puppeteer-core');
const extra = require('puppeteer-extra');
const { closeBrowser } = require('../src/utils/closeBrowser');
const { fetchMetaStats } = require('../src/utils/fetchMetaStats');
const { fetchTopDeckUrl } = require('../src/utils/fetchTopDeckUrl');
const { getUpcomingTournamentsTonamel } = require('../src/utils/scrapers/tonamel');

async function main() {
  let launches = 0;
  for (const [launcher, scrape] of [
    [extra, () => fetchMetaStats()],
    [core, () => fetchTopDeckUrl('Blue Eyes')],
    [extra, () => getUpcomingTournamentsTonamel()],
  ]) {
    for (let cycle = 0; cycle < 3; cycle++) {
      const originalLaunch = launcher.launch;
      let browser;
      launcher.launch = async options => {
        browser = await originalLaunch.call(launcher, options);
        launches++;
        browser.newPage = async () => { throw new Error('controlled page failure'); };
        return browser;
      };
      try {
        try { await scrape(); } catch (error) {
          assert.equal(error.message, 'controlled page failure');
        }
        assert.ok(browser, 'Chromium launched');
        const child = browser.process();
        assert.ok(child.exitCode !== null || child.signalCode !== null, 'Chromium exited');
      } finally {
        launcher.launch = originalLaunch;
        if (browser) await closeBrowser(browser);
      }
    }
  }

  // Simulate a broken CDP close against a real OS process.
  const browser = await core.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'],
  });
  const child = browser.process();
  const exited = once(child, 'exit');
  browser.close = () => new Promise(() => {});
  await closeBrowser(browser, 100);
  await exited;
  assert.equal(child.signalCode, 'SIGKILL');
  console.log(JSON.stringify({ scraperLaunches: launches, leakedBrowsers: 0, forcedClose: 'passed' }));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
