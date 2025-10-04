# Compilador e flags
CXX := g++
CXXFLAGS := -std=c++23 -Wall -Wextra -O2 -march=native

# Cores para terminal
GREEN := \033[0;32m
YELLOW := \033[0;33m
CYAN := \033[0;36m
RESET := \033[0m

# Diretórios
SRC_DIR := src
UTILS_DIR := $(SRC_DIR)/utils/auto-suggestions
LIB_SRC := $(SRC_DIR)/lib/Trie.cpp

# Fontes principais
CARDS_SRC := $(UTILS_DIR)/cards-autosugg-server.cpp
SKILLS_SRC := $(UTILS_DIR)/skills-autosugg-server.cpp
ARCHETYPES_SRC := $(UTILS_DIR)/archetypes-autosugg-server.cpp

# Diretório de saída
BIN_DIR := $(UTILS_DIR)/bin

# Binários
CARDS_BIN := $(BIN_DIR)/cards-autosugg-server
SKILLS_BIN := $(BIN_DIR)/skills-autosugg-server
ARCHETYPES_BIN := $(BIN_DIR)/archetypes-autosugg-server

# Alvo padrão
all: show_info $(CARDS_BIN) $(SKILLS_BIN) $(ARCHETYPES_BIN)
	@echo -e "$(GREEN)Compilação concluída com sucesso!$(RESET)"

# Mostra compilador e flags
show_info:
	@echo -e "$(CYAN)Compilador: $(YELLOW)$(CXX)$(RESET)"
	@echo -e "$(CYAN)Flags: $(YELLOW)$(CXXFLAGS)$(RESET)"
	@echo ""

# Compilação dos binários
$(CARDS_BIN): $(CARDS_SRC) $(LIB_SRC) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

$(SKILLS_BIN): $(SKILLS_SRC) $(LIB_SRC) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@


$(ARCHETYPES_BIN): $(ARCHETYPES_SRC) $(LIB_SRC) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

# Criação do diretório de binários
$(BIN_DIR):
	mkdir -p $@

# Limpeza
clean:
	rm -f $(CARDS_BIN) $(SKILLS_BIN) $(ARCHETYPES_BIN)
	@echo -e "$(GREEN)Binários removidos com sucesso.$(RESET)"

.PHONY: all clean show_info
