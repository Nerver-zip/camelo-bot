// A failed or unresponsive CDP connection must not leave Chromium running.
async function closeBrowser(browser, timeoutMs = 5000) {
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(() => browser.close()),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Browser close timed out')), timeoutMs);
      }),
    ]);
  } catch (error) {
    const child = browser.process();
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
    browser.disconnect();
    console.warn('[Browser] Encerramento forçado:', error.message);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { closeBrowser };
