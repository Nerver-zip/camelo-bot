const { BoundedCache } = require('../utils/BoundedCache');
const { closeBrowser } = require('../utils/closeBrowser');
const puppeteer = require('puppeteer-extra');
const core = require('puppeteer-core');
const { fetchMetaStats } = require('../utils/fetchMetaStats');
const { fetchTopDeckUrl } = require('../utils/fetchTopDeckUrl');
const { getUpcomingTournamentsTonamel } = require('../utils/scrapers/tonamel');

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('bounded card caches', () => {
  it('keeps only the most recently used entries during repeated lookups', () => {
    const cache = new BoundedCache(3);
    cache.set('a', 1).set('b', 2).set('c', 3);
    expect(cache.get('a')).toBe(1);
    cache.set('d', 4);
    expect([...cache.keys()]).toEqual(['c', 'a', 'd']);
    for (let i = 0; i < 10000; i++) cache.set(i, { name: `card-${i}` });
    expect(cache.size).toBe(3);
    expect([...cache.keys()]).toEqual([9997, 9998, 9999]);
  });

  it('updates an existing key without evicting another entry', () => {
    const cache = new BoundedCache(2);
    cache.set('a', 1).set('b', 2).set('a', 3);
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe(3);
    expect(cache.get('missing')).toBeUndefined();
  });
});

describe('browser cleanup', () => {
  function browserWith(close) {
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    return { close, process: () => child, disconnect: vi.fn(), child };
  }

  it('closes normally without killing the process', async () => {
    const browser = browserWith(vi.fn().mockResolvedValue());
    await closeBrowser(browser);
    expect(browser.close).toHaveBeenCalledOnce();
    expect(browser.child.kill).not.toHaveBeenCalled();
  });

  it('kills a live Chromium when close rejects', async () => {
    const browser = browserWith(vi.fn().mockRejectedValue(new Error('CDP disconnected')));
    await closeBrowser(browser);
    expect(browser.child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(browser.disconnect).toHaveBeenCalledOnce();
  });

  it('kills a live Chromium when close never settles', async () => {
    vi.useFakeTimers();
    const browser = browserWith(vi.fn(() => new Promise(() => {})));
    const closing = closeBrowser(browser, 100);
    await vi.advanceTimersByTimeAsync(100);
    await closing;
    expect(browser.child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not signal a process that has already exited', async () => {
    const browser = browserWith(vi.fn().mockRejectedValue(new Error('already closed')));
    browser.child.exitCode = 0;
    await closeBrowser(browser);
    expect(browser.child.kill).not.toHaveBeenCalled();
  });
});

describe.each([
  ['meta', puppeteer, () => fetchMetaStats(), true],
  ['top deck', core, () => fetchTopDeckUrl('Blue Eyes'), false],
  ['tonamel', puppeteer, () => getUpcomingTournamentsTonamel(), false],
])('%s scraper lifecycle', (_name, launcher, scrape, catchesErrors) => {
  for (const stage of ['newPage', 'setViewport', 'evaluate']) {
    it(`closes Chromium if ${stage} fails`, async () => {
      const error = new Error(`failure in ${stage}`);
      const page = {
        setViewport: vi.fn().mockResolvedValue(),
        setUserAgent: vi.fn().mockResolvedValue(),
        setRequestInterception: vi.fn().mockResolvedValue(),
        on: vi.fn(),
        goto: vi.fn().mockResolvedValue(),
        waitForSelector: vi.fn().mockResolvedValue(),
        evaluate: vi.fn().mockRejectedValue(error),
      };
      const browser = {
        newPage: vi.fn().mockResolvedValue(page),
        close: vi.fn().mockResolvedValue(),
      };
      if (stage === 'newPage') browser.newPage.mockRejectedValue(error);
      if (stage === 'setViewport') page.setViewport.mockRejectedValue(error);
      vi.spyOn(launcher, 'launch').mockResolvedValue(browser);
      vi.useFakeTimers();
      const result = scrape();
      const assertion = catchesErrors
        ? expect(result).resolves.toEqual([])
        : expect(result).rejects.toThrow(error.message);
      await vi.runAllTimersAsync();
      await assertion;
      expect(browser.close).toHaveBeenCalledOnce();
    });
  }
});

describe('top deck navigation', () => {
  it.each(['goto', 'waitForSelector'])('closes Chromium after a %s timeout', async stage => {
    const page = {
      setViewport: vi.fn().mockResolvedValue(),
      setRequestInterception: vi.fn().mockResolvedValue(),
      on: vi.fn(),
      goto: vi.fn().mockResolvedValue(),
      waitForSelector: vi.fn().mockResolvedValue(),
    };
    page[stage].mockRejectedValue(new Error('navigation timeout'));
    const browser = { newPage: async () => page, close: vi.fn().mockResolvedValue() };
    vi.spyOn(core, 'launch').mockResolvedValue(browser);
    await expect(fetchTopDeckUrl('Blue Eyes')).rejects.toThrow('navigation timeout');
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it('preserves the extracted URL and closes Chromium on success', async () => {
    const page = {
      setViewport: async () => {},
      setRequestInterception: async () => {},
      on: () => {},
      goto: async () => {},
      waitForSelector: async () => {},
      evaluate: async () => '/top-decks/test-deck',
    };
    const browser = { newPage: async () => page, close: vi.fn().mockResolvedValue() };
    vi.spyOn(core, 'launch').mockResolvedValue(browser);
    await expect(fetchTopDeckUrl('Blue Eyes')).resolves.toBe('https://www.duellinksmeta.com/top-decks/test-deck');
    expect(browser.close).toHaveBeenCalledOnce();
  });
});
