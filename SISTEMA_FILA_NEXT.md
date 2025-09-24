# Sistema de Fila (Next) - AliBotTS3

## Visão Geral
O sistema de fila permite que os usuários entrem em uma fila de espera para respawns que já estão claimed por outros jogadores. Quando o timer do claimed atual termina, o próximo da fila tem 10 minutos para aceitar.

## Comandos Disponíveis

### !next [código] [tempo]
Adiciona o usuário à fila de espera do respawn especificado.

**Exemplos:**
```
!next f4          - Entra na fila do f4 por 2:30 (tempo padrão)
!next f4 1:30     - Entra na fila do f4 por 1h 30min
!next a1 0:45     - Entra na fila do a1 por 45 minutos
```

**Validações:**
- Não pode entrar na fila se já tem claimed ativo no mesmo código
- Não pode entrar na fila se já está na fila do mesmo código
- Não pode entrar na fila se já tem uma oferta pendente para o mesmo código
- Tempo deve ser válido (formato HH:MM, máximo 2:30)

### !queue [código]
Mostra a fila atual de um respawn específico.

**Exemplos:**
```
!queue f4         - Mostra fila do respawn f4
!queue a1         - Mostra fila do respawn a1
```

**Exemplo de saída:**
```
🔄 Fila do Cobra Castelo (F4)

1. PlayerUm - [02:30]
2. PlayerDois - [01:15] 
3. PlayerTres - [00:30]
```

### !accept
Aceita a oferta de claimed quando chegar sua vez na fila.

**Como funciona:**
1. Quando o timer de um claimed expira, o bot processa a fila
2. O primeiro da fila recebe uma mensagem privada com a oferta
3. Tem 10 minutos para aceitar digitando `!accept`
4. Se não aceitar no tempo, é removido da fila e passa para o próximo

### !leave [código]
Remove o usuário do claimed ativo OU da fila do respawn especificado.

**Comportamento:**
1. Primeiro tenta remover do claimed ativo
2. Se não estiver no claimed, tenta remover da fila
3. Se não estiver em nenhum, informa o erro

## Fluxo de Funcionamento

### 1. Entrando na Fila
```
Usuário: !next f4 1:30
Bot: ✅ Você foi adicionado à fila do código f4 por 1:30!
     📍 Posição na fila: 3
```

### 2. Quando Chegar Sua Vez
O bot envia uma mensagem privada:
```
🎯 CLAIMED DISPONÍVEL!

O respawn Cobra Castelo (F4) está disponível!

⏰ Você tem 10 minutos para aceitar
✅ Digite: !accept para aceitar
❌ Ignore esta mensagem para recusar

🕐 Tempo expira automaticamente em 10 minutos
```

### 3. Aceitando a Oferta
```
Usuário: !accept
Bot: ✅ Claimed do código F4 aceito com sucesso por [01:30]!
```

### 4. Se o Tempo Expirar
```
Bot (mensagem privada): ⏰ Sua oportunidade para o respawn F4 expirou. 
                        Você foi removido da fila.
```

## Persistência

### Arquivos de Backup
- `timers-backup.json`: Salva os timers ativos
- `queue-backup.json`: Salva as filas e timeouts ativos

### Recuperação Após Desconexão
- Timers são restaurados com tempo atualizado
- Filas são restauradas na ordem correta
- Timeouts são recriados se ainda válidos
- Timeouts expirados são removidos automaticamente

## Integração com Sistema Existente

### Canal Claimeds Atualizado
A imagem permanente do canal agora inclui:
```
🔄 Sistema de Fila (Next) 🔄
📝 Use: !next [código] [tempo] - Entrar na fila
✅ Use: !accept - Aceitar quando for sua vez
📊 Use: !queue [código] - Ver fila do respawn
❌ Use: !leave [código] - Sair da fila
```

### Comando !help Atualizado
Inclui todos os novos comandos e exemplos de uso.

## Casos de Uso Típicos

### Cenário 1: Respawn Disputado
1. PlayerA está no f4 com timer de 2 horas
2. PlayerB usa `!next f4 1:30` (entra na fila)
3. PlayerC usa `!next f4 2:00` (entra na fila atrás do PlayerB)
4. PlayerD usa `!queue f4` (vê a fila atual)
5. Quando timer do PlayerA expira:
   - PlayerB recebe oferta por mensagem privada
   - Tem 10 minutos para usar `!accept`

### Cenário 2: Saindo da Fila
1. PlayerB está na fila do f4
2. PlayerB usa `!leave f4`
3. PlayerC automaticamente sobe uma posição na fila

### Cenário 3: Múltiplas Filas
1. PlayerB pode estar na fila do f4 E do a1 simultaneamente
2. Pode aceitar ofertas de códigos diferentes
3. Sistema trata cada código independentemente

## Logs e Monitoramento

O sistema gera logs detalhados:
- `🔄 PlayerB adicionado à fila do código f4 (posição 2)`
- `🗑️ PlayerB removido da fila do código f4`
- `⏰ Timeout expirado para PlayerB no código f4`
- `✅ PlayerB aceitou claimed do código f4`
- `💾 Filas salvas: 3 itens na fila, 1 timeouts ativos`

## Limitações e Regras

1. **Um claimed por código**: Não pode ter claimed ativo + estar na fila do mesmo código
2. **Timeout de 10 minutos**: Tempo fixo para aceitar ofertas
3. **Ordem FIFO**: Primeiro a entrar, primeiro a sair da fila  
4. **Persistência total**: Filas sobrevivem a desconexões do bot
5. **Validação rigorosa**: Sistema impede ações inválidas com mensagens claras

## Comandos de Ajuda

- `!help` - Ajuda resumida com novos comandos
- `!comandos` - Lista completa com exemplos
- `!queue [código]` - Ver status de fila específica
