const path = require("path");
const { spawn } = require('child_process');
//const { queryTrie } = require("./queryTrie.js");

const cardServerPath = path.join(__dirname, "bin/cards-autosugg-server");
const skillServerPath = path.join(__dirname, "bin/skills-autosugg-server");
const archetypeServerPath = path.join(__dirname, "bin/archetypes-autosugg-server");

let servers = [];

// Função para iniciar um servidor
function startServer(cmd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [], {
      cwd: path.dirname(cmd),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let serverReady = false;

    const onData = (data) => {
      const msg = data.toString().trim();
      console.log(`[${path.basename(cmd)}] ${msg}`);

      if (!serverReady && msg.includes("Server is ready")) {
        serverReady = true;
        proc.stdout.off("data", onData);
        resolve(proc);
      }
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", (err) => console.error(`[${path.basename(cmd)} ERROR] ${err}`));
    proc.on("exit", (code) => console.log(`[${path.basename(cmd)}] exited with code ${code}`));
    proc.on("error", reject);
  });
}

async function initServers(kill = true) {
  if (!kill && servers && servers.length)
    return servers;

  // Mata servidores antigos, se existirem
  if (kill && servers && servers.length) {
    for (const proc of servers) {
      if (proc && typeof proc.kill === 'function' && !proc.killed) {
        proc.kill();
        console.log(`[${proc.spawnfile || 'server'}] killed`);
      }
    }
  }

  // Inicia novos servidores
  servers = await Promise.all([
    startServer(cardServerPath),
    startServer(skillServerPath),
    startServer(archetypeServerPath),
  ]);

  global.runningServers = servers; // evita GC
  console.log("Todos os servidores foram iniciados/reiniciados com sucesso!");
  return servers;
}
module.exports = { initServers };

/*(async () => {
  const [cardServer, skillServer, archetypeServer] = await Promise.all([
    startServer(cardServerPath),
    startServer(skillServerPath),
    startServer(archetypeServerPath),
  ]);

  console.log(await queryTrie(cardServer, "Blue-Eyes"));
  console.log(await queryTrie(skillServer, "Draw Sense"));
  console.log(await queryTrie(archetypeServer, "Dark"));
})();*/
