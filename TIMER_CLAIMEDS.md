# ⏰ Sistema de Timer para Claimeds - Guia Completo

## 🆕 Funcionalidades Implementadas

### 📋 Comando `!resp` com Timer

**Nova Sintaxe:**
```
!resp [código] [tempo]
```

**Parâmetros:**
- **código**: Identificador do claimed (ex: f4, a1, b3)
- **tempo**: Duração no formato HH:MM (OPCIONAL)

### ⏰ Especificações do Timer

#### 📏 Limites e Padrões
- **Tempo Padrão:** 2:30 (se não especificar tempo)
- **Tempo Máximo:** 2:30 (2 horas e 30 minutos)  
- **Tempo Mínimo:** 0:01 (1 minuto)
- **Formato:** HH:MM (horas:minutos)

#### 🔄 Funcionamento
- **Contagem Regressiva:** Atualiza a cada segundo
- **Atualização Visual:** Tempo restante mostrado no canal Claimeds
- **Remoção Automática:** Usuário removido quando tempo expira
- **Cancelamento Manual:** Comando `!leave` cancela o timer

### 🧪 Exemplos de Uso

#### ✅ Comandos Válidos

```bash
# Tempo padrão (2:30)
!resp f4

# 1 hora e 30 minutos  
!resp f4 1:30

# 30 minutos
!resp a1 0:30

# 15 minutos
!resp b3 0:15

# Tempo máximo (2:30)
!resp x7 2:30
```

#### ❌ Comandos Inválidos

```bash
# Tempo excede máximo
!resp f4 3:00  # ❌ Máximo é 2:30

# Formato inválido
!resp f4 90    # ❌ Use formato HH:MM
!resp f4 1.5   # ❌ Use formato HH:MM
!resp f4 1:90  # ❌ Minutos devem ser 00-59

# Sem código
!resp 1:30     # ❌ Código obrigatório
```

### 📊 Novos Comandos

#### `!timers`
**Função:** Lista todos os timers ativos
**Exemplo de Resposta:**
```
⏰ **Timers Ativos:**
• Usuario1: F4 - 1:25:30 restante
• Usuario2: A1 - 0:45:12 restante
• Usuario3: B3 - 0:05:45 restante
```

#### `!leave [código]`
**Função:** Remove usuário e cancela timer
**Exemplo:** `!leave f4`

### 🎮 Canal Claimeds - Formato Atualizado

**Antes (sem timer):**
```
👤 Usuario1 (ID: 123) está no F4
```

**Agora (com timer):**
```
⏰ Usuario1 (ID: 123) está no F4 - 1:25:30 restante
⏰ Usuario2 (ID: 456) está no A1 - 0:45:12 restante
```

### 🔧 Funcionalidades Técnicas

#### ✅ Sistema de Timer Inteligente
- **Múltiplos Timers:** Cada usuário pode ter vários códigos com timers independentes
- **Atualização em Tempo Real:** Canal Claimeds atualizado a cada segundo
- **Persistência:** Timers continuam mesmo com reconexões do usuário
- **Limpeza Automática:** Timers cancelados quando bot desconecta

#### ✅ Validações Robustas
- **Formato de Tempo:** Valida formato HH:MM rigorosamente
- **Limites:** Impede tempos maiores que 2:30
- **Duplicatas:** Substitui timer existente se usuário usar !resp novamente
- **Identificação Única:** Usa UserID + Código como chave única

### 🧪 Cenários de Teste

#### **Cenário 1: Uso Básico**
```
1. Usuario: !resp f4
2. Bot: "✅ Usuário registrado no código f4 por 2:30!"  
3. Canal Claimeds: "⏰ Usuario (ID: 123) está no F4 - 2:30:00 restante"
4. [Aguardar 30 segundos]
5. Canal Claimeds: "⏰ Usuario (ID: 123) está no F4 - 2:29:30 restante"
```

#### **Cenário 2: Tempo Customizado**
```
1. Usuario: !resp a1 1:15
2. Bot: "✅ Usuário registrado no código a1 por 1:15!"
3. Canal Claimeds: "⏰ Usuario (ID: 123) está no A1 - 1:15:00 restante"
```

#### **Cenário 3: Múltiplos Códigos**
```
1. Usuario: !resp f4 2:00
2. Usuario: !resp a1 1:30  
3. Canal Claimeds mostra ambos com timers independentes
4. Usuario: !leave f4 (remove apenas F4, mantém A1)
```

#### **Cenário 4: Timer Expira**
```
1. Usuario: !resp b3 0:01
2. [Aguardar 1 minuto]
3. Bot remove automaticamente do canal Claimeds
4. Console: "⏰ Timer expirado para Usuario no código b3"
```

#### **Cenário 5: Validação de Erro**
```
1. Usuario: !resp f4 3:00
2. Bot: "❌ Tempo inválido! Use o formato HH:MM (máximo 2:30)"
```

### 📋 Logs de Sistema

**Logs do Bot (visíveis no console):**
```
⏰ Iniciando timer de 1:30:00 para Usuario no código f4
⏰ Timer cancelado para Usuario no código f4
⏰ Timer expirado para Usuario no código f4  
⏰ Usuario removido automaticamente do código f4 (tempo esgotado)
```

### 🎯 Comandos de Ajuda Atualizados

**`!help` - Resumo:**
```
🎯 **Gerenciamento Claimeds:**
• !resp [código] [tempo] - Registrar com timer (ex: !resp f4 1:30)
• !leave [código] - Sair do código (ex: !leave f4)

⏰ **Timer Claimeds:**
• Tempo padrão: 2:30 se não especificar
• Máximo: 2:30 (2h 30min)  
• Formato: HH:MM (ex: 1:15)
```

**`!comandos` - Completo:**
```
🎯 **Gerenciamento Claimeds:**
• !resp [código] [tempo] - Adicionar usuário com timer
• !leave [código] - Remover usuário de um código
• !timers - Ver timers ativos

⏰ **Sistema de Timer:**
• Tempo padrão: 2:30 (se não especificar)
• Máximo permitido: 2:30 (2h 30min)
• Formato: HH:MM (horas:minutos)
• Contagem regressiva em tempo real
```

### 🚀 Status da Implementação

✅ **Timer em Tempo Real** - Atualiza a cada segundo
✅ **Validação de Tempo** - Formato HH:MM, máximo 2:30  
✅ **Tempo Padrão** - 2:30 quando não especificado
✅ **Múltiplos Timers** - Por usuário e código
✅ **Remoção Automática** - Quando timer expira
✅ **Cancelamento Manual** - Comando !leave
✅ **Comando !timers** - Lista timers ativos
✅ **Logs Detalhados** - Sistema de monitoramento
✅ **Limpeza de Recursos** - Timers cancelados na desconexão

**Status: 🎉 SISTEMA DE TIMER COMPLETAMENTE IMPLEMENTADO!**
