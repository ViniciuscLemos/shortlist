// The skills it knows, each with the ways people write it in Portuguese and English.
// A dictionary instead of AI on purpose: it runs in the browser, it's instant, and when
// it says "React is missing" you can see exactly why.

export type SkillKind = 'language' | 'framework' | 'data' | 'cloud' | 'practice' | 'soft' | 'tongue';

export interface Skill {
  id: string;
  name: string;
  kind: SkillKind;
  aliases: string[];
}

// an alias starting with = only counts written exactly like that ("Go", "Excel", "REST"),
// because in lower case it's an ordinary word ("go to", "excel at", "the rest")
const s = (id: string, name: string, kind: SkillKind, ...aliases: string[]): Skill => ({
  id, name, kind, aliases: aliases.includes(`=${name}`) ? aliases : [name, ...aliases],
});

export const SKILLS: Skill[] = [
  // programming languages
  s('javascript', 'JavaScript', 'language', '=JS', 'ecmascript', 'es6'),
  s('typescript', 'TypeScript', 'language', '=TS'),
  s('python', 'Python', 'language'),
  s('java', 'Java', 'language'),
  s('kotlin', 'Kotlin', 'language'),
  s('csharp', 'C#', 'language', 'c sharp', 'csharp'),
  s('cpp', 'C++', 'language', 'cpp'),
  s('c', 'C', 'language', '=C', 'linguagem c', 'c language'),
  s('go', 'Go', 'language', '=Go', 'golang'),
  s('rust', 'Rust', 'language'),
  s('php', 'PHP', 'language'),
  s('ruby', 'Ruby', 'language'),
  s('swift', 'Swift', 'language', '=Swift'),
  s('sql', 'SQL', 'language'),
  s('html', 'HTML', 'language', 'html5'),
  s('css', 'CSS', 'language', 'css3', 'sass', 'scss'),
  s('bash', 'Shell script', 'language', 'bash', 'shell', 'powershell'),

  // frameworks and libraries
  s('react', 'React', 'framework', 'react.js', 'reactjs'),
  s('next', 'Next.js', 'framework', 'nextjs'),
  s('vue', 'Vue', 'framework', 'vue.js', 'vuejs'),
  s('angular', 'Angular', 'framework', 'angularjs'),
  s('node', 'Node.js', 'framework', 'node', 'nodejs'),
  s('express', 'Express', 'framework', '=Express', 'express.js', 'expressjs'),
  s('nestjs', 'NestJS', 'framework', 'nest.js'),
  s('fastify', 'Fastify', 'framework'),
  s('django', 'Django', 'framework'),
  s('flask', 'Flask', 'framework'),
  s('fastapi', 'FastAPI', 'framework'),
  s('spring', 'Spring Boot', 'framework', '=Spring', 'springboot'),
  s('dotnet', '.NET', 'framework', 'dotnet', 'asp.net', '.net core'),
  s('laravel', 'Laravel', 'framework'),
  s('react-native', 'React Native', 'framework'),
  s('flutter', 'Flutter', 'framework'),
  s('tailwind', 'Tailwind', 'framework', 'tailwindcss'),
  s('pandas', 'Pandas', 'framework'),
  s('jest', 'Jest', 'framework'),
  s('playwright', 'Playwright', 'framework'),
  s('cypress', 'Cypress', 'framework'),

  // data
  s('postgres', 'PostgreSQL', 'data', 'postgres', 'postgre'),
  s('mysql', 'MySQL', 'data', 'mariadb'),
  s('sqlserver', 'SQL Server', 'data', 'mssql'),
  s('oracle', 'Oracle', 'data', '=Oracle', 'oracle db', 'pl/sql'),
  s('mongodb', 'MongoDB', 'data', 'mongo'),
  s('redis', 'Redis', 'data'),
  s('sqlite', 'SQLite', 'data'),
  s('elasticsearch', 'Elasticsearch', 'data'),
  s('kafka', 'Kafka', 'data', 'apache kafka'),
  s('rabbitmq', 'RabbitMQ', 'data', 'rabbit'),
  s('powerbi', 'Power BI', 'data', 'powerbi'),
  s('excel', 'Excel', 'data', '=Excel', 'planilhas'),
  s('ml', 'Machine learning', 'data', 'aprendizado de maquina', '=ML'),
  s('llm', 'LLMs', 'data', 'llm', 'openai', 'chatgpt', 'ia generativa', 'generative ai', 'gpt'),

  // cloud and tooling
  s('aws', 'AWS', 'cloud', 'amazon web services', 'ec2', 's3', 'lambda'),
  s('azure', 'Azure', 'cloud', 'microsoft azure'),
  s('gcp', 'Google Cloud', 'cloud', 'gcp', 'google cloud platform'),
  s('docker', 'Docker', 'cloud', 'containers', 'conteineres', 'docker compose'),
  s('kubernetes', 'Kubernetes', 'cloud', 'k8s'),
  s('terraform', 'Terraform', 'cloud', 'infraestrutura como codigo', 'infrastructure as code', 'iac'),
  s('linux', 'Linux', 'cloud', 'ubuntu', 'debian'),
  s('git', 'Git', 'cloud', 'github', 'gitlab', 'bitbucket'),
  s('cicd', 'CI/CD', 'cloud', 'ci cd', 'github actions', 'gitlab ci', 'jenkins', 'integracao continua', 'continuous integration'),
  s('n8n', 'n8n', 'cloud', 'zapier', 'make.com'),

  // practices
  s('rest', 'REST APIs', 'practice', '=REST', 'restful', 'api rest', 'apis rest', 'rest api', 'rest apis'),
  s('graphql', 'GraphQL', 'practice'),
  s('microservices', 'Microservices', 'practice', 'microsservicos', 'micro servicos', 'microservicos'),
  s('tests', 'Automated tests', 'practice', 'testes automatizados', 'testes unitarios', 'unit tests', 'unit testing', 'tdd', 'testes de integracao', 'integration tests', 'automated testing'),
  s('agile', 'Agile', 'practice', 'scrum', 'kanban', 'metodologias ageis', 'ageis'),
  s('clean', 'Clean code', 'practice', 'clean architecture', 'arquitetura limpa', 'solid', 'design patterns', 'padroes de projeto'),
  s('security', 'Security', 'practice', 'seguranca', 'owasp', 'oauth', 'jwt'),
  s('ux', 'UX/UI', 'practice', '=UX', '=UI', 'ux/ui', 'ui/ux', 'figma', 'user experience'),
  s('accessibility', 'Accessibility', 'practice', 'acessibilidade', 'wcag', 'a11y'),
  s('data-modeling', 'Data modeling', 'practice', 'modelagem de dados'),

  // people skills
  s('communication', 'Communication', 'soft', 'comunicacao', 'boa comunicacao', 'comunicativo'),
  s('teamwork', 'Teamwork', 'soft', 'trabalho em equipe', 'colaboracao', 'collaboration'),
  s('leadership', 'Leadership', 'soft', 'lideranca', 'liderar', 'mentoria', 'mentoring'),
  s('problem-solving', 'Problem solving', 'soft', 'resolucao de problemas', 'resolver problemas'),
  s('ownership', 'Ownership', 'soft', 'proatividade', 'proativo', 'autonomia', 'proactive'),

  // languages people speak
  s('english', 'English', 'tongue', 'ingles', 'ingles avancado', 'ingles fluente', 'fluent english'),
  s('spanish', 'Spanish', 'tongue', 'espanhol'),
];

export const KIND_LABEL: Record<SkillKind, string> = {
  language: 'Languages',
  framework: 'Frameworks and libraries',
  data: 'Data',
  cloud: 'Cloud and tools',
  practice: 'Practices',
  soft: 'Working with people',
  tongue: 'Spoken languages',
};
