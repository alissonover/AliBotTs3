# 🔄 Sistema de Persistência de Timers

## 📋 Funcionalidades Implementadas

### ✅ **Persistência Automática**
O bot agora mantém os timers mesmo se desconectar e reconectar automaticamente.

### 🔧 **Como Funciona**

#### 📁 **Arquivo de Backup**
- **Local**: `timers-backup.json` (pasta raiz do projeto)
- **Formato**: JSON com dados dos timers ativos
- **Limpeza**: Arquivo é removido após recuperação bem-sucedida

#### 💾 **Salvamento Automático**
O bot salva os timers automaticamente:
- ✅ Ao criar um novo timer
- ✅ A cada atualização (minuto)
- ✅ Ao remover um timer
- ✅ Antes de desconectar (Ctrl+C ou falha)

#### 🔄 **Recuperação Inteligente**
Ao reconectar, o bot:
1. 📂 Verifica se existe arquivo de backup
2. ⏰ Calcula tempo decorrido durante desconexão
3. 🧮 Atualiza tempo restante de cada timer
4. ❌ Remove timers que expiraram durante desconexão
5. ✅ Recria timers válidos com tempo correto
6. 🗑️ Limpa arquivo de backup

### 📊 **Estrutura dos Dados Salvos**

```json
[
  {
    "userId": "123",
    "userName": "Jogador1",
    "codigo": "f4",
    "nomeRespawn": "Cobra Castelo",
    "tier": "Tier 1",
    "tempoRestante": 90,
    "iniciadoEm": 1702999200000
  }
]
```

### 🎯 **Cenários de Uso**

#### 🔌 **Desconexão Planejada**
```
!resp f4 1:30  → Timer criado (90 minutos)
[Bot desconecta via Ctrl+C]
[Bot reconecta após 10 minutos]
→ Timer continua com 80 minutos restantes
```

#### ⚡ **Desconexão Inesperada**
```
!resp a1 0:45  → Timer criado (45 minutos)
[Queda de internet/servidor]
[Bot reconecta após 50 minutos]
→ Timer foi removido automaticamente (expirou)
```

#### 🔄 **Múltiplos Timers**
```
!resp f4 2:00  → Timer 1: 120 minutos
!resp a1 1:15  → Timer 2: 75 minutos
[Bot desconecta por 30 minutos]
[Bot reconecta]
→ Timer 1: 90 minutos restantes
→ Timer 2: 45 minutos restantes
```

### 🎮 **Comandos Disponíveis**

#### ⏰ **Verificar Timers Ativos**
```
!timers
```
Mostra todos os timers com formato atualizado.

#### 🎯 **Criar Timer**
```
!resp f4 1:30
```
Timer é automaticamente salvo e persistido.

#### 🚪 **Remover Timer**
```
!leave f4
```
Timer é removido e backup atualizado.

### 🔧 **Logs e Monitoramento**

#### 📊 **Logs de Persistência**
```
💾 Timers salvos: 2 ativos
🔄 Recuperando 2 timers salvos...
✅ Timer restaurado: Jogador1 (f4) - 85 min restantes
⏰ Timer de Jogador2 (a1) expirou durante desconexão
🗑️ Arquivo de backup limpo após recuperação
```

#### 🎯 **Logs de Desconexão**
```
💾 Salvando 3 timers ativos antes da desconexão...
⏰ Timer pausado: Jogador1 - f4 (90 min restantes)
🔌 Bot desconectado - timers preservados
```

### 🛡️ **Robustez e Segurança**

#### ✅ **Validações**
- ✅ Verificação de existência do arquivo
- ✅ Validação de formato JSON
- ✅ Cálculo preciso de tempo decorrido
- ✅ Remoção automática de timers expirados
- ✅ Tratamento de erros de arquivo

#### 🔄 **Recuperação de Erros**
- Se arquivo está corrompido: Continua sem timers
- Se cálculo falha: Ignora timer específico
- Se canal não existe: Tenta recriar estrutura

### 🚀 **Benefícios**

#### 👑 **Para Usuários**
- ✅ Timers nunca se perdem por desconexão
- ✅ Funciona com reinicializações do servidor
- ✅ Transparente - não precisam refazer comandos
- ✅ Precisão mantida mesmo com longas desconexões

#### 🔧 **Para Administração**
- ✅ Manutenção sem perda de dados
- ✅ Reinicialização segura do bot
- ✅ Logs detalhados para diagnóstico
- ✅ Sistema robusto contra falhas

### 📝 **Notas Importantes**

1. **Arquivo de Backup**: É criado automaticamente, não mexer manualmente
2. **Limpeza**: Arquivo é removido após recuperação bem-sucedida
3. **Precisão**: Timers mantêm precisão de minutos
4. **Limite**: Funciona com qualquer quantidade de timers ativos
5. **Compatibilidade**: Funciona com todos os códigos de respawn

---

**🎯 Agora o bot é 100% confiável para gerenciamento de Claimeds!**
