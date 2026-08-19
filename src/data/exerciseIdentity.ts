const seedIdentities=[
  ['e01','document-structure','Минимальный документ','document-structure:minimal-document'],
  ['e02','document-structure','Исправьте каркас','document-structure:fix-scaffold'],
  ['e03','document-structure','Заголовок и абзац','document-structure:heading-paragraph'],
  ['e04','sections-paragraphs','Два уровня','sections-paragraphs:two-levels'],
  ['e05','sections-paragraphs','Два абзаца','sections-paragraphs:two-paragraphs'],
  ['e06','sections-paragraphs','Исправьте команду','sections-paragraphs:fix-section-command'],
  ['e07','text-formatting','Смысловой акцент','text-formatting:semantic-emphasis'],
  ['e08','text-formatting','Маркированный список','text-formatting:unordered-list'],
  ['e09','text-formatting','Нумерованный список','text-formatting:ordered-list'],
  ['e10','math-modes','Формула в строке','math-modes:inline-formula'],
  ['e11','math-modes','Выключная формула','math-modes:display-formula'],
  ['e12','math-modes','Исправьте режим','math-modes:fix-math-mode'],
  ['e13','fractions-powers','Дробь','fractions-powers:fraction'],
  ['e14','fractions-powers','Степень и индекс','fractions-powers:power-subscript'],
  ['e15','fractions-powers','Корень из дроби','fractions-powers:sqrt-fraction'],
  ['e16','equations-theorems','Нумеруемое уравнение','equations-theorems:numbered-equation'],
  ['e17','equations-theorems','Две строки align','equations-theorems:two-line-align'],
  ['e18','equations-theorems','Доказательство','equations-theorems:proof'],
  ['e19','basic-tables','Таблица 2×2','basic-tables:table-2x2'],
  ['e20','basic-tables','Исправьте строку','basic-tables:fix-row'],
  ['e21','basic-tables','Заголовочная строка','basic-tables:header-row'],
  ['e22','figures-captions','Окружение figure','figures-captions:figure-caption'],
  ['e23','figures-captions','Вставка изображения','figures-captions:include-image'],
  ['e24','figures-captions','Исправьте пакет','figures-captions:add-graphicx'],
  ['e25','tikz-basics','Первый tikzpicture','tikz-basics:tikz-picture'],
  ['e26','tikz-basics','Линия','tikz-basics:draw-line'],
  ['e27','tikz-basics','Узел','tikz-basics:node-label'],
  ['e28','labels-refs','Метка раздела','labels-refs:section-label'],
  ['e29','labels-refs','Перекрёстная ссылка','labels-refs:cross-reference'],
  ['e30','labels-refs','Дублирующая метка','labels-refs:duplicate-label'],
  ['e31','bibliography-basics','Первая цитата','bibliography-basics:first-citation'],
  ['e32','bibliography-basics','Список литературы','bibliography-basics:bibliography-list'],
  ['e33','bibliography-basics','Согласуйте ключ','bibliography-basics:align-key'],
  ['e34','custom-commands','Команда R','custom-commands:command-r'],
  ['e35','custom-commands','Команда с аргументом','custom-commands:command-argument'],
  ['e36','custom-commands','Уберите дублирование','custom-commands:remove-duplication'],
  ['e37','large-documents','Подключите главу','large-documents:include-chapter'],
  ['e38','large-documents','Фрагмент преамбулы','large-documents:input-macros'],
  ['e39','large-documents','Осмысленная декомпозиция','large-documents:decompose-chapter'],
  ['e40','academic-paper','Титульные метаданные','academic-paper:title-metadata'],
  ['e41','academic-paper','Аннотация','academic-paper:abstract'],
  ['e42','academic-paper','Структура статьи','academic-paper:paper-structure'],
  ['e43','debugging','Три ошибки','debugging:three-errors'],
  ['e44','debugging','Несогласованные окружения','debugging:mismatched-environments'],
  ['e45','debugging','Пакет amsmath','debugging:amsmath-package']
] as const;

type SeedIdentity=typeof seedIdentities[number];
const byLegacyId=new Map<string,string>(seedIdentities.map(([legacyId,,,stableId])=>[legacyId,stableId]));
const bySeedIdentity=new Map<string,string>(seedIdentities.map(([,lessonId,title,stableId])=>[seedKey(lessonId,title),stableId]));

/** Historical positional IDs are accepted forever as persistence aliases. */
export const legacyExerciseIdAliases:Readonly<Record<string,string>>=Object.freeze(Object.fromEntries(byLegacyId));

export function canonicalExerciseId(id:string){return legacyExerciseIdAliases[id]??id;}

/** Retained for compatibility tests and migration tooling; runtime IDs are authored explicitly. */
export function stableSeedExerciseId(lessonId:string,title:string){
  const stable=bySeedIdentity.get(seedKey(lessonId,title));
  if(!stable)throw new Error(`Seed exercise identity is not registered: ${lessonId} / ${title}`);
  return stable;
}

export function migrateExerciseIdList(values:readonly string[]|undefined){
  return [...new Set((values??[]).filter(value=>typeof value==='string').map(canonicalExerciseId))];
}

export function migrateExerciseKeyedRecord<T>(record:Record<string,T>|undefined,merge:(left:T|undefined,right:T)=>T){
  const migrated:Record<string,T>={};
  for(const [legacyId,value] of Object.entries(record??{})){
    const id=canonicalExerciseId(legacyId);
    migrated[id]=merge(migrated[id],value);
  }
  return migrated;
}

export function migrateDocumentKey(key:string){
  if(!key.startsWith('exercise:'))return key;
  return `exercise:${canonicalExerciseId(key.slice('exercise:'.length))}`;
}

export function migrateLegacyDraftRecord(drafts:Record<string,string>|undefined){
  const migrated:Record<string,string>={};
  for(const [key,value] of Object.entries(drafts??{}))if(typeof value==='string')migrated[migrateDocumentKey(key)]=value;
  return migrated;
}

export function registeredSeedExerciseIdentities():readonly SeedIdentity[]{return seedIdentities;}

function seedKey(lessonId:string,title:string){return `${lessonId}\u0000${title}`;}
