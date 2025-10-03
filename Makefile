# Compilador e flags
CXX := g++
CXXFLAGS := -std=c++23 -Wall -Wextra -O2 -march=native

# Diretórios
SRC_DIR := src
UTILS_DIR := $(SRC_DIR)/utils/auto-suggestions
LIB_SRC := $(SRC_DIR)/lib/Trie.cpp

# Fontes principais
CARDS_SRC := $(UTILS_DIR)/cards-autosugg-server.cpp
SKILLS_SRC := $(UTILS_DIR)/skills-autosugg-server.cpp

# Diretórios de saída
CARDS_BIN_DIR := $(UTILS_DIR)/bin
SKILLS_BIN_DIR := $(UTILS_DIR)/bin

# Binários
CARDS_BIN := $(CARDS_BIN_DIR)/cards-autosugg-server
SKILLS_BIN := $(SKILLS_BIN_DIR)/skills-autosugg-server

# Alvo padrão
all: $(CARDS_BIN) $(SKILLS_BIN)

$(CARDS_BIN): $(CARDS_SRC) $(LIB_SRC) | $(CARDS_BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

$(SKILLS_BIN): $(SKILLS_SRC) $(LIB_SRC) | $(SKILLS_BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

$(CARDS_BIN_DIR) $(SKILLS_BIN_DIR):
	mkdir -p $@

# Limpeza
clean:
	rm -f $(CARDS_BIN) $(SKILLS_BIN)

.PHONY: all clean
