#pragma once

#include <vector>
#include <map>
#include <string>

using namespace std;

struct TrieNode {
    map<char, TrieNode*> children;
    vector<string> originals;
};

class Trie {
public:
    TrieNode* root;
    
    Trie(); 

    void insert(const string& word);

    vector<string> search(const string& prefix);
};

