const path = require("path");
const { spawn } = require('child_process');
//const { queryTrie } = require("./queryTrie.js");

const cardServerPath = path.join(__dirname, "bin/cards-autosugg-server");
const skillServerPath = path.join(__dirname, "bin/skills-autosugg-server");

async function startServer(cmd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [], {
      cwd: path.dirname(cmd),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let serverReady = false;

    const onData = (data) => {
      const msg = data.toString().trim();
      if (!serverReady) {
        console.log(msg); 
      }

      if (msg.includes("Server is ready")) { 
        serverReady = true;
        proc.stdout.off("data", onData);
        resolve(proc);
      }
    };

    proc.stdout.on("data", onData);
    proc.on("error", reject);
  });
}

let cardServer = null;
let skillServer = null;

async function initServers() {
  if (!cardServer || !skillServer) {
    [cardServer, skillServer] = await Promise.all([
      startServer(cardServerPath),
      startServer(skillServerPath),
    ]);
  }
  return { cardServer, skillServer };
}

module.exports = { initServers };

/*(async () => {
  const [cardServer, skillServer] = await Promise.all([
    startServer(cardServerPath),
    startServer(skillServerPath)
  ]);

  console.log(await queryTrie(cardServer, "Blue-Eyes"));
  console.log(await queryTrie(skillServer, "Draw Sense"));
})();*/


