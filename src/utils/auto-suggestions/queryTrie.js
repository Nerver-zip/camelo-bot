function queryTrie(proc, input, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 3000;
  return new Promise((resolve, reject) => {
    let buffer = "";

    const onData = (data) => {
      buffer += data.toString();
      if (buffer.includes("\n")) {
        proc.stdout.off("data", onData);
        clearTimeout(tmr);
        const response = buffer.split("\n")[0].trim();
        resolve(response ? response.split(";") : []);
      }
    };

    const tmr = setTimeout(() => {
      proc.stdout.off("data", onData);
      reject(new Error("Timeout waiting response from server"));
    }, timeoutMs);

    proc.stdout.on("data", onData);
    proc.stdin.write(input + "\n", (err) => {
      if (err) {
        clearTimeout(tmr);
        proc.stdout.off("data", onData);
        reject(err);
      }
    });
  });
}

module.exports = { queryTrie };

