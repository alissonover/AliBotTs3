# 🔑 Como Obter a Senha do ServerAdmin no TeamSpeak 3

## Método 1: Verificar Logs do Servidor

### Windows:
1. Navegue até a pasta de instalação do TeamSpeak 3 Server
2. Vá para a pasta `logs/`
3. Abra o arquivo de log mais recente (`ts3server_*.log`)
4. Procure por uma linha como:
   ```
   ServerAdmin password= "SUA_SENHA_AQUI"
   ```

### Exemplo de localização:
```
C:\TeamSpeak3-Server_win64\logs\ts3server_2025-09-23_*.log
```

## Método 2: Reiniciar o Servidor para Gerar Nova Senha

### Windows:
1. **Pare o servidor TeamSpeak 3**
2. **Abra o Prompt de Comando como Administrador**
3. **Navegue até a pasta do servidor**
4. **Execute o comando:**
   ```cmd
   ts3server.exe createinifile=1
   ```
5. **A nova senha será exibida no console**

## Método 3: Usar o Arquivo de Token (se disponível)

Se você tem um arquivo `privilege key`, use-o para criar um usuário administrativo.

## Método 4: Conectar via Cliente e Verificar

1. **Abra o TeamSpeak 3 Client**
2. **Conecte ao servidor com privilégios de admin**
3. **Vá em Tools → ServerQuery Login**
4. **Crie um novo usuário ou veja as configurações atuais**

## 🚀 Teste Rápido

Após obter a senha correta:

1. **Edite o arquivo `config.json`:**
   ```json
   {
     "teamspeak": {
       "password": "SUA_SENHA_CORRETA_AQUI"
     }
   }
   ```

2. **Execute o diagnóstico:**
   ```bash
   npm run diagnostico
   ```

3. **Se der certo, execute o bot:**
   ```bash
   npm run dev
   ```

## 🔧 Alternativa: Criar Usuário Personalizado

Se não conseguir acessar com serveradmin, você pode:

1. **Conectar como admin pelo cliente TS3**
2. **Criar um usuário ServerQuery personalizado**
3. **Usar essas credenciais no bot**

## 📝 Configuração Atual Detectada:

- **Host:** localhost  
- **Usuário:** serveradmin
- **Senha atual:** CoyNhoEO (provavelmente incorreta)

**Próximo passo:** Obter a senha correta usando um dos métodos acima e atualizar o `config.json`.
