#include "Trie.h"
#include <queue>
    
Trie::Trie() { 
    root = new TrieNode(); 
}

void Trie::insert(const string& word) {
    TrieNode* node = root;
    for (char c : word) {
        char lower = tolower((unsigned char)c); // normaliza pra inserir
        if (!node->children[lower]) {
            node->children[lower] = new TrieNode();
        }
        node = node->children[lower];
    }
    node->originals.push_back(word); // mantém forma original
}

vector<string> Trie::search(const string& prefix) {
    if (!root) 
        return {};

    TrieNode* node = root;
    for (char c : prefix) {
        char lower = tolower((unsigned char)c); // case-insensitive
        if (!node->children.count(lower))
            return {};
        node = node->children[lower];
    }

    vector<string> words;
    queue<TrieNode*> q;
    q.push(node);

    while (!q.empty() && words.size() < 25) { // corta cedo
        TrieNode* currNode = q.front();
        q.pop();

        // adiciona palavras originais armazenadas neste nó
        for (const string& orig : currNode->originals) {
            words.push_back(orig);
            if (words.size() >= 25) break;
        }

        // percorre filhos em ordem lexicográfica (map)
        for (const auto& [c, nxt] : currNode->children) {
            q.push(nxt);
        }
    }

    return words;
}
