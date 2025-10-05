#include <iostream>
#include <fstream>
#include <filesystem>
#include "../../lib/Trie.h"

namespace fs = std::filesystem;

int main(int argc, char* argv[]) {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    Trie trie;

    // Caminho do dump relativo ao binário
    fs::path exePath = fs::canonical(argv[0]).parent_path();      // diretório do binário
    fs::path dumpPath = exePath / "../../../local/dump/cards.txt";   // dump dir
    dumpPath = fs::canonical(dumpPath);                           // transforma em caminho absoluto

    cout << "Abrindo dump de cards em: " << dumpPath << "\n";

    std::ifstream file(dumpPath);
    if (!file.is_open()) {
        cout << "❌ Não foi possível abrir o dump de cards!" << "\n";
    } else {
        cout << "✅ Dump de cards aberto com sucesso!" << "\n";
        std::string line;
        while (getline(file, line)) {
            if (!line.empty()) 
                trie.insert(line);
        }
    }

    cout << "Card Server is ready" << "\n";
    cout.flush();

    // loop de escuta (recebe query pela stdin)
    string query;
    while (getline(cin, query)) {
        cerr << "[RECV_QUERY] '" << query << "'\n"; 
        vector<string> results = trie.search(query);
        cerr << "[RESULTS_COUNT] " << results.size() << "\n";

        // envia resposta só por stdout (sem tag extra)
        for (size_t i = 0; i < results.size(); i++) {
            cout << results[i];
            if (i < results.size() - 1) cout << ";";
        }
        cout << "\n";
        cout.flush();

        cerr << "[SENT]\n"; 
    }
}
