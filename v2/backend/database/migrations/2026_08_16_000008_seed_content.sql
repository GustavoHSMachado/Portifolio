-- Carga inicial do conteúdo, a partir do currículo.
--
-- Existe para a área administrativa abrir com o conteúdo real em vez de telas
-- vazias. Tudo aqui é editável pelo admin depois.
--
-- Deliberadamente ausentes: endereço, CEP e data de nascimento. Idade e
-- endereço residencial não ajudam em recrutamento e, uma vez publicados,
-- ficam indexados e arquivados de forma permanente.
--
-- O campo evidence das habilidades fica vazio de propósito: preenchê-lo aqui
-- seria eu afirmar o alcance do que ele sabe. É ele quem escreve.

INSERT INTO profile (
    id, full_name, short_name, role, headline, objective, summary,
    city, state, website_url, github_url, linkedin_url, whatsapp_url, resume_path
) VALUES (
    1,
    'Gustavo Henrique Santos Machado',
    'Gustavo Henrique',
    'Analista de Sistemas',
    'Análise de sistemas, dados e desenvolvimento back-end',
    'Atuação como Analista de Sistemas Júnior, Desenvolvedor Júnior, Analista de Dados Júnior ou Product Owner Júnior.',
    'Profissional de Tecnologia da Informação com experiência prática em análise de sistemas, suporte técnico e investigação de bugs em ambiente produtivo. Atuação direta com consultas SQL, análise de inconsistências e apoio ao time de desenvolvimento na resolução de problemas. Experiência em levantamento e refinamento de requisitos, gestão de backlog e condução de cerimônias ágeis, atuando como ponte entre áreas de negócio e time de desenvolvimento.',
    'Ibirité',
    'MG',
    'https://gustavohsmachado.com.br',
    'https://github.com/GustavoHSMachado',
    'https://www.linkedin.com/in/gustavo-henrique-santos-machado-22379440/',
    'https://wa.me/5531986585208',
    NULL
);

-- Formação: da mais recente para a mais antiga.
-- Engenharia de Dados conclui em agosto de 2026, o mês corrente na carga —
-- fica como em_andamento até ele confirmar a conclusão pelo admin.
INSERT INTO education (course, institution, level, status, completed_at, position) VALUES
    ('Engenharia de Software', 'Faculdade Pitágoras', 'pos_graduacao', 'em_andamento', '2026-12-01', 1),
    ('Engenharia de Dados', 'Faculdade Pitágoras', 'pos_graduacao', 'em_andamento', '2026-08-01', 2),
    ('Sistemas de Informação', 'Faculdade Pitágoras', 'graduacao', 'concluido', '2025-12-01', 3),
    ('Técnico em Informática', 'Polimig - Escola Politécnica de Minas Gerais', 'tecnico', 'concluido', '2012-09-01', 4);

-- Experiência: ended_at nulo no emprego atual.
INSERT INTO experiences (company, role, description, started_at, ended_at, position) VALUES
    (
        'CDC Bank',
        'Analista de Suporte a Cliente JR II',
        'Análise e investigação de bugs em ambiente produtivo, com execução de consultas SQL para identificação de inconsistências em dados. Apoio contínuo ao time de desenvolvimento na correção de falhas, além de atendimento técnico voltado à resolução de incidentes críticos. Experiência em sistemas financeiros e transacionais.',
        '2025-03-01', NULL, 1
    ),
    (
        'Gráfica Olib Impressões',
        'Auxiliar de Acabamento Digital',
        'Fechamento de artes para impressão, preparo e organização de material, produção e acabamento final dos produtos da gráfica. Responsável pela comunicação com parceiros e pelo estoque de acabamento e matéria-prima.',
        '2020-03-01', '2025-02-28', 2
    ),
    (
        'Infolíder Informática',
        'Técnico em Manutenção de Micros I',
        'Montagem e manutenção de computadores e redes, venda de peças e produtos de informática, e atendimento ao cliente presencial e remoto.',
        '2013-03-01', '2019-03-31', 3
    ),
    (
        'Imagem Stúdio Gráfico & Personalizações',
        'Web Designer',
        'Criação de websites, layouts e bancos de dados, com HTML, CSS e PHP.',
        '2012-01-01', '2013-03-31', 4
    );

INSERT INTO skills (name, category, evidence, position) VALUES
    ('PHP',                        'Linguagens',  NULL, 1),
    ('SQL / MySQL',                'Dados',       NULL, 2),
    ('Java',                       'Linguagens',  NULL, 3),
    ('HTML',                       'Front-end',   NULL, 4),
    ('CSS',                        'Front-end',   NULL, 5),
    ('APIs REST',                  'Arquitetura', NULL, 6),
    ('Banco de dados relacional',  'Dados',       NULL, 7),
    ('Git',                        'Ferramentas', NULL, 8),
    ('Jira',                       'Ferramentas', NULL, 9),
    ('Scrum',                      'Processo',    NULL, 10),
    ('Debugging e análise de erros','Processo',   NULL, 11);

-- Primeiro estudo de caso. Os números vêm do próprio repositório e são
-- verificáveis no histórico: nada aqui é estimativa.
INSERT INTO projects (
    slug, title, summary, problem, decisions, result,
    stack, repository_url, demo_url, published, position
) VALUES (
    'portifolio-v2',
    'Portfólio v2 - reconstrução com auditoria de segurança',
    'Reconstrução completa de um portfólio em PHP procedural, a partir de uma auditoria que encontrou 22 falhas de segurança.',
    'A primeira versão guardava senhas em texto plano e tinha um fluxo de redefinição que permitia assumir qualquer conta sabendo apenas o e-mail. A auditoria levantou 22 achados, 5 deles críticos, incluindo SQL Injection e um painel administrativo acessível por qualquer usuário autenticado.',
    'Corrigir no lugar preservaria a arquitetura que permitiu as falhas, então a v2 foi construída do zero, aproveitando apenas o conteúdo textual e a tipografia. No back-end, MVC próprio em PHP 8.3 com roteador, pipeline de middleware e container de injeção de dependência. Autenticação por JWT com refresh rotativo e detecção de reuso por família, senhas em Argon2id e rate limit persistido no banco. No front, Next.js com TypeScript estrito e um design system em tokens.',
    'Nove verificações de qualidade bloqueiam o merge, e 96 testes automatizados cobrem unidade, integração e ponta a ponta. A própria suíte encontrou defeitos reais durante a construção, entre eles um migrador que marcava migrações como aplicadas sem aplicá-las e um login que respondia com sucesso e devolvia o usuário para a tela de entrada.',
    JSON_ARRAY('PHP 8.3', 'MySQL 8', 'Next.js 14', 'TypeScript', 'Docker', 'PHPUnit', 'Playwright'),
    'https://github.com/GustavoHSMachado/Portifolio',
    NULL,
    1,
    1
);

-- ROLLBACK
-- DELETE FROM projects WHERE slug = 'portifolio-v2';
-- DELETE FROM skills;
-- DELETE FROM experiences;
-- DELETE FROM education;
-- DELETE FROM profile WHERE id = 1;
