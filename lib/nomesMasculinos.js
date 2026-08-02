// Lista de nomes masculinos comuns no Brasil, em minúsculo e sem acento.
// Isso é uma APROXIMAÇÃO baseada em nome, não uma detecção real de gênero
// (não existe esse dado disponível via WhatsApp). Vai errar em nomes fora
// da lista, apelidos, nomes estrangeiros ou nomes de exibição que não são
// o nome real da pessoa.
const NOMES_MASCULINOS = new Set([
  'joao', 'jose', 'antonio', 'francisco', 'carlos', 'paulo', 'pedro', 'lucas',
  'luiz', 'marcos', 'luis', 'gabriel', 'rafael', 'daniel', 'marcelo', 'bruno',
  'eduardo', 'felipe', 'raimundo', 'rodrigo', 'manoel', 'manuel', 'fabio',
  'andre', 'diego', 'leonardo', 'fernando', 'ricardo', 'gustavo', 'sergio',
  'roberto', 'alexandre', 'anderson', 'vinicius', 'wesley', 'matheus',
  'mateus', 'thiago', 'tiago', 'vitor', 'victor', 'caio', 'igor', 'leandro',
  'renato', 'julio', 'claudio', 'flavio', 'jorge', 'adriano', 'wagner',
  'douglas', 'guilherme', 'henrique', 'israel', 'jefferson', 'jonathan',
  'juliano', 'kaique', 'kauan', 'kevin', 'marcio', 'mauricio', 'mario',
  'nelson', 'nicolas', 'otavio', 'patrick', 'rangel', 'reginaldo',
  'reinaldo', 'robson', 'rogerio', 'ronaldo', 'samuel', 'sandro',
  'sebastiao', 'valdir', 'vagner', 'washington', 'wellington', 'william',
  'yuri', 'alan', 'alex', 'allan', 'arthur', 'artur', 'augusto', 'benjamin',
  'bernardo', 'breno', 'caique', 'cesar', 'cristian', 'cristiano', 'danilo',
  'davi', 'david', 'denis', 'dennis', 'edson', 'elias', 'emerson',
  'enzo', 'erick', 'erik', 'ernesto', 'ezequiel', 'fabricio', 'fabiano',
  'gabriel', 'geraldo', 'gilberto', 'gilson', 'gustavo', 'heitor', 'hugo',
  'ian', 'ivan', 'jair', 'janio', 'jean', 'jefferson', 'joaquim', 'joel',
  'jonas', 'jorge', 'jose', 'juan', 'kelvin', 'lauro', 'leonel', 'levi',
  'lorenzo', 'lucca', 'luccas', 'luciano', 'luigi', 'marco', 'martin',
  'mateus', 'max', 'miguel', 'milton', 'moacir', 'murilo', 'nathan',
  'nicolas', 'noah', 'nuno', 'oscar', 'osvaldo', 'pablo', 'peterson',
  'plinio', 'rafael', 'raul', 'renan', 'ryan', 'salvador', 'saulo',
  'severino', 'silvio', 'theo', 'theodoro', 'thomas', 'tomas', 'ulisses',
  'valentim', 'valter', 'walter', 'vitor', 'wallace', 'wallison', 'yago',
  'zeca', 'zacarias', 'alfredo', 'alberto', 'aristides', 'armando',
  'benedito', 'clovis', 'edmilson', 'edilson', 'edinei', 'edvaldo',
  'elton', 'euclides', 'evaldo', 'ezio', 'fernando', 'geovane', 'geovani',
  'giovani', 'giovanni', 'helio', 'heitor', 'hernani', 'hudson', 'humberto',
  'ismael', 'itamar', 'ivo', 'janio', 'jarbas', 'jonatas', 'josimar',
  'juvenal', 'lauro', 'leonidas', 'lindomar', 'luan', 'luidi', 'marlon',
  'messias', 'moises', 'natan', 'nilton', 'nivaldo', 'norberto', 'orlando',
  'osmar', 'ozias', 'pericles', 'romario', 'ronald', 'roque', 'rubens',
  'sidnei', 'sidney', 'sivaldo', 'stenio', 'tadeu', 'talles', 'tales',
  'valmir', 'vicente', 'vitorio', 'zeferino'
]);

module.exports = NOMES_MASCULINOS;
