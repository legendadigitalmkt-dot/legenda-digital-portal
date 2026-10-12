# Portal → Hostinger por GitHub Actions

**Decisão posterior do titular:** usar Web app Node.js por integração GitHub. Consulte [HOSTINGER_NODE.md](HOSTINGER_NODE.md). Este documento descreve somente o caminho PHP/SSH anterior, preservado e desativado para compatibilidade; não ativá-lo para uma app Node gerenciada.

Destino exclusivo: `legendadigital.com.br`. Repositório: `legendadigitalmkt-dot/legenda-digital-portal`. Banco público do build: `yltnjgngkomelfltdyky`. O workflow não publica o software e não altera Auth, DNS, CMS ou banco.

## Estado

O fluxo foi implementado para publicação por SSH autenticado por chave. Ele é disparado por alterações em `main` ou por `Run workflow`, somente em `main`. Começa desativado, sem depender de login no navegador na nuvem. Implementar/mergear o workflow não significa ter configurado a conexão nem publicado o site. O PR registra CI, merge e qualquer execução real.

## Configuração inicial no GitHub

Preencher os valores diretamente em **Settings → Secrets and variables → Actions** deste repositório. Nenhum segredo deve ser enviado no chat ou salvo em arquivos de fonte.

| Repository secret | Valor necessário |
| --- | --- |
| `HOSTINGER_SSH_HOST` | Endereço do servidor da hospedagem do portal. |
| `HOSTINGER_SSH_PORT` | Porta SSH confirmada para esse servidor, sem presumir uma porta. |
| `HOSTINGER_SSH_USER` | Usuário existente autorizado a publicar o portal. |
| `HOSTINGER_REMOTE_DIR` | Caminho absoluto confirmado, terminando em `/domains/legendadigital.com.br/public_html`. |
| `HOSTINGER_SSH_PRIVATE_KEY` | Chave privada do acesso autorizado correspondente, sem senha interativa. |
| `HOSTINGER_SSH_KNOWN_HOSTS` | Entrada OpenSSH do servidor, com hostname/porta corretos e chave de host verificada por fonte confiável. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave **publishable** do Supabase exclusivo do portal, começando por `sb_publishable_`. Nunca usar uma chave privilegiada. |

Não gerar/conceder novos acessos ou trocar senhas automaticamente. Usar somente a conexão autorizada. O workflow exige identificação de host fixa e `StrictHostKeyChecking=yes`; não confia silenciosamente em `ssh-keyscan` nem aceita identidade nova automaticamente.

Após concluir os valores, definir a repository variable `PORTAL_DEPLOY_ENABLED` como `true`. Até lá, a execução registra **Deployment disabled** e não acessa a hospedagem. Quando habilitado, uma configuração incompleta falha antes do build/envio. O conector disponível nesta sessão não permite cadastrar Secrets; eles não foram criados pelo agente.

## Publicação

1. Executar `Deploy portal to Hostinger` em `main` após configuração. Futuras alterações de `main` disparam o mesmo fluxo.
2. CI/build/audit, testes do deploy e lint PHP precisam passar antes da conexão. A chave SSH só entra no passo de publicação.
3. O pacote inclui somente arquivos públicos; exclui `.htaccess` e `site-runtime.php`, preservados no servidor. O destino precisa existir, não pode redirecionar por symlink e precisa usar o backend do portal e proteger o runtime.
4. O servidor recebe staging privado fora de `public_html`. O hash do pacote, os arquivos, o PHP e os manifestos são validados antes da alteração real.
5. O backup completo termina antes do envio ao diretório público. Assets entram antes das páginas. Nenhum arquivo antigo é apagado automaticamente; arquivos de uploads existentes e bundles de abas abertas permanecem.
6. Smoke somente leitura confirma home, contato, admin/noindex, artigo PHP, sitemap e os hashes do favicon/logo no domínio. Não envia formulários ou mensagens e não realiza login.

O servidor precisa de Bash, PHP CLI, `rsync`, `tar`, `grep`, `awk` e `sha256sum`, além de espaço para staging e backup. Se um requisito falhar antes da publicação, a versão pública permanece intacta. O workflow serializa deploys e não cancela um envio em andamento. Actions fixadas por SHA; token do job apenas com leitura de fonte. Pull requests nunca disparam publicação.

## Backup e rollback

Os backups ficam em `<pasta do domínio>/.ld-portal-deploy/<sha>-<run_id>-<attempt>.before.tar.gz`, fora da raiz pública, com permissão 600. Staging/estado têm acesso privado. Eles não são removidos automaticamente; acompanhar o uso de disco e definir retenção separadamente.

Falha durante a cópia executa restauração do backup. Se o smoke público falhar, o cliente solicita a mesma restauração e mantém o workflow como falho. Se a própria restauração falhar, o job também falha: não anuncia sucesso. A restauração recoloca arquivos anteriores, mantendo novos assets não referenciados; não remove dados ou uploads.

Para um rollback posterior, primeiro reverter o PR de fonte aprovado no GitHub e executar o workflow de `main`; isso publica a versão reconstruída. Para restauração emergencial do backup, executar `remote_common.sh` seguido de `remote_rollback.sh`, pelo mesmo SSH verificado, com o destino confirmado e o identificador exato da publicação. Os dois argumentos passam pelas mesmas proteções. Conferir o domínio após a restauração.

## Validação e limites

Testes isolados usam arquivos sintéticos e cópias/backup/restauração reais; somente a CLI PHP é simulada nos testes locais. CI valida a sintaxe PHP real. Não houve acesso SSH real, criação de chave, cadastro de Secrets nem publicação nesta implementação. Smoke de produção e conferência visual ficam pendentes até a conexão ser configurada. O fluxo é SSH; não introduz fallback para FTP sem criptografia.

Referências oficiais: [transferência SSH na Hostinger](https://www.hostinger.com/support/4466851-how-to-upload-a-backup-using-ssh-at-hostinger/), [segurança de workflows no GitHub](https://docs.github.com/en/actions/reference/security/secure-use), [Secrets do Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).
