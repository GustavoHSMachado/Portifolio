# v1 — Legado

⚠️ **Esta versão está em manutenção corretiva. Não implemente funcionalidades aqui.**

Código original do portfólio: PHP procedural, MySQL via mysqli e template Namari
com jQuery. Substituído pela [v2](../v2), que é onde todo desenvolvimento novo acontece.

---

## O que é aceito nesta pasta

| Tipo de mudança | Aceito? |
|---|---|
| Correção de vulnerabilidade | ✅ Sim |
| Correção de bug que quebra o site em produção | ✅ Sim |
| Melhoria de código sem risco (ex.: extrair partials) | ⚠️ Só se já houver Issue aberta |
| Nova funcionalidade | ❌ Não — implemente na v2 |
| Redesign, refatoração ampla | ❌ Não — a v2 já é isso |

---

## Estado de segurança

Uma auditoria completa foi feita e as falhas críticas **de código** foram corrigidas.
O diagnóstico com os 22 findings está em
[../docs/RELATORIO-REFATORACAO.md](../docs/RELATORIO-REFATORACAO.md).

### Pendência crítica

A senha de aplicativo do Gmail que estava em `configEmail.php` foi removida do
código, mas **permanece no histórico do Git** deste repositório público e continua
válida até ser revogada manualmente.

→ https://myaccount.google.com/apppasswords

---

## Como rodar

```bash
composer install
cp .env.example .env          # preencha as credenciais

mysqldump -u root -p site > backup.sql          # backup antes de migrar
mysql -u root -p site < database/migrations/002_hash_senhas_e_reset.sql
php database/migrate_passwords.php              # converte senhas em texto plano
```

> Sem o último passo **nenhum usuário existente consegue logar**: o login passou a
> usar `password_verify()` e as senhas no banco ainda estavam em texto plano.

Aponte o document root do Apache para esta pasta.

---

## Estrutura

```
v1/
├── bootstrap.php            Inicialização (env, sessão, headers, autoload)
├── src/                     Env, Database, Auth, Csrf, Mailer, PasswordReset, Validator
├── database/
│   ├── migrations/          Schema versionado
│   └── migrate_passwords.php
├── *.php                    Views e controllers (legado)
├── css/ js/ fonts/ images/  Assets do template Namari
└── vendor/                  Dependências do Composer
```
