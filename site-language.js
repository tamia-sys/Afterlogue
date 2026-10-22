/* Afterlogue international interface, first language pack.
 * Locally translated UI, persisted per browser, applied across ALL site pages.
 * Film metadata, member writing and third-party synopses remain in their
 * original languages; do not label external/user content as translated.
 */
(()=>{
'use strict';
const KEY='afterlogue.ui-language.v1';
const supported=['en','es','fr','pt'];
const names={en:'English',es:'Español',fr:'Français',pt:'Português'};
const translations={"Language":{"es":"Idioma","fr":"Langue","pt":"Idioma"},"English":{"es":"Inglés","fr":"Anglais","pt":"Inglês"},"Sign in":{"es":"Iniciar sesión","fr":"Se connecter","pt":"Entrar"},"Already a member?":{"es":"¿Ya tienes una cuenta?","fr":"Déjà membre ?","pt":"Já tem uma conta?"},"Welcome to afterlogue.":{"es":"Te damos la bienvenida a afterlogue.","fr":"Bienvenue sur afterlogue.","pt":"Bem-vindo ao afterlogue."},"PERSONALIZED FILM & TV DISCOVERY":{"es":"DESCUBRE CINE Y SERIES A TU MEDIDA","fr":"DÉCOUVERTE PERSONNALISÉE DE FILMS ET SÉRIES","pt":"DESCOBERTA PERSONALIZADA DE FILMES E SÉRIES"},"A more personal way to discover what to watch next.":{"es":"Una forma más personal de descubrir qué ver.","fr":"Une façon plus personnelle de choisir quoi regarder.","pt":"Uma forma mais pessoal de descobrir o que assistir."},"Create an account →":{"es":"Crear una cuenta →","fr":"Créer un compte →","pt":"Criar uma conta →"},"Continue as guest":{"es":"Continuar como invitado","fr":"Continuer en invité","pt":"Continuar como visitante"},"Personalized":{"es":"Personalizado","fr":"Personnalisé","pt":"Personalizado"},"Recommendations that evolve with you.":{"es":"Recomendaciones que evolucionan contigo.","fr":"Des recommandations qui évoluent avec vous.","pt":"Recomendações que evoluem com você."},"Find something for your mood, the moment, or the season.":{"es":"Encuentra algo para tu estado de ánimo, el momento o la estación.","fr":"Trouvez une histoire pour votre humeur, le moment ou la saison.","pt":"Encontre algo para seu humor, o momento ou a estação."},"Talk about films and shows with other viewers.":{"es":"Habla de películas y series con otros espectadores.","fr":"Parlez de films et de séries avec d'autres spectateurs.","pt":"Converse sobre filmes e séries com outras pessoas."},"HOW IT WORKS":{"es":"CÓMO FUNCIONA","fr":"COMMENT ÇA MARCHE","pt":"COMO FUNCIONA"},"01 — FIRST IMPRESSIONS":{"es":"01 — PRIMERAS IMPRESIONES","fr":"01 — PREMIÈRES IMPRESSIONS","pt":"01 — PRIMEIRAS IMPRESSÕES"},"02 — DISCOVERY":{"es":"02 — DESCUBRIMIENTO","fr":"02 — DÉCOUVERTE","pt":"02 — DESCOBERTA"},"03 — LOG":{"es":"03 — REGISTRO","fr":"03 — JOURNAL","pt":"03 — REGISTRO"},"Let's get acquainted":{"es":"Conozcámonos","fr":"Faisons connaissance","pt":"Vamos nos conhecer"},"Start with the films  and shows you know. Tell us what you thought.":{"es":"Empieza por películas y series que ya conoces. Cuéntanos qué te parecieron.","fr":"Commencez par des films et des séries que vous connaissez. Donnez votre avis.","pt":"Comece pelos filmes e séries que você conhece. Conte o que achou."},"Find your next story":{"es":"Encuentra tu próxima historia","fr":"Trouvez votre prochaine histoire","pt":"Encontre sua próxima história"},"Choose Movies or TV. Get five picks at a time.":{"es":"Elige cine o series. Recibe cinco sugerencias por vez.","fr":"Choisissez Films ou Séries. Découvrez cinq suggestions à la fois.","pt":"Escolha Filmes ou Séries. Receba cinco sugestões por vez."},"The more you log, the better it gets":{"es":"Cuanto más registres, mejores serán tus recomendaciones","fr":"Plus vous notez, plus les suggestions s'affinent","pt":"Quanto mais você registra, melhores ficam as sugestões"},"Every title you log helps us make better picks for you.":{"es":"Cada título que registras nos ayuda a recomendarte mejor.","fr":"Chaque titre ajouté nous aide à mieux vous conseiller.","pt":"Cada título registrado nos ajuda a recomendar melhor."},"Recent Log":{"es":"Registro reciente","fr":"Journal récent","pt":"Registro recente"},"Loved":{"es":"Me encantó","fr":"Adoré","pt":"Amei"},"Liked":{"es":"Me gustó","fr":"Aimé","pt":"Gostei"},"Okay":{"es":"Regular","fr":"Moyen","pt":"Mais ou menos"},"Not for me":{"es":"No es para mí","fr":"Pas pour moi","pt":"Não é para mim"},"Movies":{"es":"Películas","fr":"Films","pt":"Filmes"},"Movie":{"es":"Película","fr":"Film","pt":"Filme"},"TV Shows":{"es":"Series","fr":"Séries","pt":"Séries"},"TV shows":{"es":"Series","fr":"Séries","pt":"Séries"},"Film":{"es":"Película","fr":"Film","pt":"Filme"},"Films":{"es":"Películas","fr":"Films","pt":"Filmes"},"TV series":{"es":"Serie","fr":"Série","pt":"Série"},"TV":{"es":"TV","fr":"Télé","pt":"TV"},"Watched":{"es":"Vistas","fr":"Vus","pt":"Assistidos"},"Watchlist":{"es":"Para ver","fr":"À regarder","pt":"Quero assistir"},"Favorites":{"es":"Favoritos","fr":"Favoris","pt":"Favoritos"},"The film ends. The conversation doesn't.":{"es":"La película termina. La conversación continúa.","fr":"Le film se termine. La conversation continue.","pt":"O filme termina. A conversa continua."},"Home":{"es":"Inicio","fr":"Accueil","pt":"Início"},"Explore":{"es":"Explorar","fr":"Explorer","pt":"Explorar"},"Log":{"es":"Registro","fr":"Journal","pt":"Registro"},"Discuss":{"es":"Debatir","fr":"Discuter","pt":"Discutir"},"Your account":{"es":"Tu cuenta","fr":"Votre compte","pt":"Sua conta"},"Edit profile":{"es":"Editar perfil","fr":"Modifier le profil","pt":"Editar perfil"},"Account settings":{"es":"Configuración de la cuenta","fr":"Paramètres du compte","pt":"Configurações da conta"},"Sign out":{"es":"Cerrar sesión","fr":"Se déconnecter","pt":"Sair"},"Welcome back.":{"es":"Te damos la bienvenida.","fr":"Bon retour.","pt":"Bem-vindo de volta."},"Make it yours.":{"es":"Hazlo tuyo.","fr":"À vous de jouer.","pt":"Faça do seu jeito."},"Save your impressions.":{"es":"Guarda tus impresiones.","fr":"Enregistrez vos impressions.","pt":"Salve suas impressões."},"Continue with Google":{"es":"Continuar con Google","fr":"Continuer avec Google","pt":"Continuar com Google"},"Continue with Apple":{"es":"Continuar con Apple","fr":"Continuer avec Apple","pt":"Continuar com Apple"},"or continue with email":{"es":"o con tu correo electrónico","fr":"ou continuer par e-mail","pt":"ou continuar com e-mail"},"Email":{"es":"Correo electrónico","fr":"E-mail","pt":"E-mail"},"Password":{"es":"Contraseña","fr":"Mot de passe","pt":"Senha"},"Create account →":{"es":"Crear cuenta →","fr":"Créer un compte →","pt":"Criar conta →"},"Sign in →":{"es":"Iniciar sesión →","fr":"Se connecter →","pt":"Entrar →"},"New to Afterlogue?":{"es":"¿Eres nuevo en Afterlogue ?","fr":"Vous découvrez Afterlogue ?","pt":"Primeira vez no Afterlogue?"},"Create account":{"es":"Crear cuenta","fr":"Créer un compte","pt":"Criar conta"},"Sign in / Create account":{"es":"Inicia sesión / Crea una cuenta","fr":"Se connecter / Créer un compte","pt":"Entrar / Criar conta"},"Resend confirmation":{"es":"Reenviar confirmación","fr":"Renvoyer la confirmation","pt":"Reenviar confirmação"},"Opening your story.":{"es":"Abriendo tu historia.","fr":"Votre histoire s'ouvre.","pt":"Abrindo sua história."},"A world of":{"es":"Un mundo de","fr":"Un monde de","pt":"Um mundo de"},"stories awaits.":{"es":"historias te espera.","fr":"récits vous attend.","pt":"histórias espera por você."},"A world of stories awaits.":{"es":"Te espera un mundo de historias.","fr":"Tout un monde d'histoires vous attend.","pt":"Um mundo de histórias espera por você."},"Discover again":{"es":"Descubrir más","fr":"Découvrir encore","pt":"Descobrir novamente"},"Discover another selection →":{"es":"Descubrir otra selección →","fr":"Découvrir une autre sélection →","pt":"Descobrir outra seleção →"},"Selected for you.":{"es":"Selección para ti.","fr":"Sélection pour vous.","pt":"Seleção para você."},"Five recommendations shaped by your taste.":{"es":"Cinco recomendaciones según tus gustos.","fr":"Cinq recommandations selon vos goûts.","pt":"Cinco recomendações para o seu gosto."},"Your first impressions will shape what comes next.":{"es":"Tus primeras impresiones darán forma a las próximas sugerencias.","fr":"Vos premières impressions guideront les prochaines suggestions.","pt":"Suas primeiras impressões vão guiar as próximas sugestões."},"AFTERLOGUE / A LITTLE REMINDER":{"es":"AFTERLOGUE / UN RECORDATORIO","fr":"AFTERLOGUE / UN PETIT RAPPEL","pt":"AFTERLOGUE / UM LEMBRETE"},"A story already waiting.":{"es":"Una historia que te espera.","fr":"Une histoire qui vous attend déjà.","pt":"Uma história à sua espera."},"A story you saved might be just what you're looking for.":{"es":"Quizás una historia que guardaste sea justo lo que buscas.","fr":"Une histoire enregistrée est peut-être exactement ce qu'il vous faut.","pt":"Uma história salva pode ser exatamente o que você procura."},"Something from your collection, perhaps?":{"es":"¿Algo de tu colección, quizás?","fr":"Et si vous puisiez dans votre collection ?","pt":"Que tal algo da sua coleção?"},"Another three ↻":{"es":"Otras tres ↻","fr":"Trois autres ↻","pt":"Mais três ↻"},"View Watchlist ↗":{"es":"Ver lista para ver ↗","fr":"Voir ma liste ↗","pt":"Ver lista ↗"},"Your Watchlist couldn't be loaded. Please try again.":{"es":"No se pudo cargar tu lista. Inténtalo de nuevo.","fr":"Impossible de charger votre liste. Réessayez.","pt":"Não foi possível carregar sua lista. Tente novamente."},"Sign in to revisit stories from your private Watchlist.":{"es":"Inicia sesión para volver a los títulos de tu lista privada.","fr":"Connectez-vous pour retrouver les titres de votre liste privée.","pt":"Entre para rever os títulos da sua lista privada."},"Finding a few stories you saved…":{"es":"Buscando algunas historias que guardaste…","fr":"Recherche de quelques histoires enregistrées…","pt":"Buscando algumas histórias salvas…"},"Opening your Watchlist…":{"es":"Abriendo tu lista…","fr":"Ouverture de votre liste…","pt":"Abrindo sua lista…"},"Three stories from your Watchlist, picked for a second look.":{"es":"Tres títulos de tu lista para volver a descubrir.","fr":"Trois titres de votre liste à redécouvrir.","pt":"Três títulos da sua lista para redescobrir."},"A story worth sharing.":{"es":"Una historia para compartir.","fr":"Une histoire à partager.","pt":"Uma história para compartilhar."},"Go to my Log":{"es":"Ir a mi registro","fr":"Ouvrir mon journal","pt":"Ir para meu registro"},"Share card ↗":{"es":"Compartir tarjeta ↗","fr":"Partager la carte ↗","pt":"Compartilhar cartão ↗"},"PASS THE STORY ALONG":{"es":"COMPARTE LA HISTORIA","fr":"FAITES PASSER L'HISTOIRE","pt":"COMPARTILHE A HISTÓRIA"},"Share story ↗":{"es":"Compartir historia ↗","fr":"Partager l'histoire ↗","pt":"Compartilhar história ↗"},"Copy link":{"es":"Copiar enlace","fr":"Copier le lien","pt":"Copiar link"},"Watch trailer":{"es":"Ver tráiler","fr":"Voir la bande-annonce","pt":"Ver trailer"},"Seen it":{"es":"Ya la vi","fr":"Déjà vu","pt":"Já vi"},"Add to Watchlist":{"es":"Añadir a mi lista","fr":"Ajouter à ma liste","pt":"Adicionar à lista"},"＋ Add to Watchlist":{"es":"＋ Añadir a mi lista","fr":"＋ Ajouter à ma liste","pt":"＋ Adicionar à lista"},"＋ Sign in to save":{"es":"＋ Inicia sesión para guardar","fr":"＋ Connectez-vous pour enregistrer","pt":"＋ Entre para salvar"},"✓ In your Watchlist":{"es":"✓ En tu lista","fr":"✓ Dans votre liste","pt":"✓ Na sua lista"},"Saved to your Watchlist.":{"es":"Guardado en tu lista.","fr":"Ajouté à votre liste.","pt":"Salvo na sua lista."},"Saved to your Watchlist. Welcome back to your story.":{"es":"Guardado en tu lista. Ya puedes volver a tu historia.","fr":"Ajouté à votre liste. Retrouvez votre histoire.","pt":"Salvo na sua lista. Sua história está aqui."},"Saved to your Watchlist. This story will no longer appear in Home recommendations.":{"es":"Guardado en tu lista. Ya no aparecerá entre las recomendaciones de Inicio.","fr":"Ajouté à votre liste. Cette histoire ne figurera plus dans les recommandations de l'accueil.","pt":"Salvo na sua lista. Esta história não aparecerá mais nas recomendações do Início."},"Removed from your Watchlist.":{"es":"Eliminado de tu lista.","fr":"Retiré de votre liste.","pt":"Removido da sua lista."},"Already in your Watchlist.":{"es":"Ya está en tu lista.","fr":"Déjà dans votre liste.","pt":"Já está na sua lista."},"Story details":{"es":"Detalles","fr":"Détails","pt":"Detalhes"},"More story options":{"es":"Más opciones","fr":"Autres options","pt":"Mais opções"},"View details":{"es":"Ver detalles","fr":"Voir les détails","pt":"Ver detalhes"},"Details":{"es":"Detalles","fr":"Détails","pt":"Detalhes"},"Back to Discover":{"es":"Volver a Descubrir","fr":"Retour aux découvertes","pt":"Voltar à descoberta"},"← Back to Discover":{"es":"← Volver a Descubrir","fr":"← Retour aux découvertes","pt":"← Voltar à descoberta"},"The conversation continues.":{"es":"La conversación continúa.","fr":"La conversation continue.","pt":"A conversa continua."},"Save":{"es":"Guardar","fr":"Enregistrer","pt":"Salvar"},"＋ Save":{"es":"＋ Guardar","fr":"＋ Enregistrer","pt":"＋ Salvar"},"✓ Saved":{"es":"✓ Guardado","fr":"✓ Enregistré","pt":"✓ Salvo"},"Another selection ↗":{"es":"Otra selección ↗","fr":"Une autre sélection ↗","pt":"Outra seleção ↗"},"Try again ↗":{"es":"Reintentar ↗","fr":"Réessayer ↗","pt":"Tentar novamente ↗"},"Find my stories →":{"es":"Encontrar mis historias →","fr":"Trouver mes histoires →","pt":"Encontrar minhas histórias →"},"What would you like to watch?":{"es":"¿Qué te gustaría ver?","fr":"Qu'aimeriez-vous regarder ?","pt":"O que gostaria de assistir?"},"What pace feels right?":{"es":"¿Qué ritmo te apetece?","fr":"Quel rythme vous convient ?","pt":"Qual ritmo combina com você?"},"A film":{"es":"Una película","fr":"Un film","pt":"Um filme"},"A TV show":{"es":"Una serie","fr":"Une série","pt":"Uma série"},"Either one":{"es":"Cualquiera","fr":"Les deux me vont","pt":"Tanto faz"},"One story, one sitting.":{"es":"Una historia para una sesión.","fr":"Une histoire en une séance.","pt":"Uma história de uma vez."},"Something to spend a little longer with.":{"es":"Algo para disfrutar durante más tiempo.","fr":"Une histoire à suivre plus longtemps.","pt":"Algo para acompanhar por mais tempo."},"I'll go where the story takes me.":{"es":"Me dejaré llevar por la historia.","fr":"Je me laisse guider par l'histoire.","pt":"Vou aonde a história me levar."},"Take your time":{"es":"Sin prisa","fr":"Prenez votre temps","pt":"Sem pressa"},"Somewhere between":{"es":"Algo intermedio","fr":"Entre les deux","pt":"Um pouco dos dois"},"Keep me on my toes":{"es":"Que me sorprenda","fr":"Surprenez-moi","pt":"Me surpreenda"},"Quiet, reflective, unhurried.":{"es":"Tranquilo, reflexivo, sin prisa.","fr":"Calme, contemplatif, sans hâte.","pt":"Calmo, reflexivo, sem pressa."},"A bit of everything.":{"es":"Un poco de todo.","fr":"Un peu de tout.","pt":"Um pouco de tudo."},"Energy, tension, momentum.":{"es":"Energía, tensión, movimiento.","fr":"Énergie, tension, rythme.","pt":"Energia, tensão, movimento."},"Something for your mood.":{"es":"Algo para tu estado de ánimo.","fr":"Une histoire pour votre humeur.","pt":"Algo para seu humor."},"Save a story":{"es":"Guardar una historia","fr":"Enregistrer une histoire","pt":"Salvar uma história"},"Your collection":{"es":"Tu colección","fr":"Votre collection","pt":"Sua coleção"},"Your first impressions guide your personalized experience.":{"es":"Tus primeras impresiones guían tu experiencia personal.","fr":"Vos premières impressions guident votre expérience.","pt":"Suas primeiras impressões guiam sua experiência."},"Continue →":{"es":"Continuar →","fr":"Continuer →","pt":"Continuar →"},"Skip for now →":{"es":"Omitir por ahora →","fr":"Passer pour l'instant →","pt":"Pular por enquanto →"},"About 2 minutes":{"es":"Unos 2 minutos","fr":"Environ 2 minutes","pt":"Cerca de 2 minutos"},"First Impressions":{"es":"Primeras impresiones","fr":"Premières impressions","pt":"Primeiras impressões"},"Tell us what you think":{"es":"Cuéntanos qué opinas","fr":"Donnez votre avis","pt":"Conte o que achou"},"Search films and TV":{"es":"Buscar películas y series","fr":"Rechercher des films et des séries","pt":"Buscar filmes e séries"},"Films & TV":{"es":"Películas y series","fr":"Films et séries","pt":"Filmes e séries"},"Search titles…":{"es":"Buscar títulos…","fr":"Rechercher des titres…","pt":"Buscar títulos…"},"Selected / 001":{"es":"Selección / 001","fr":"Sélection / 001","pt":"Seleção / 001"},"Your collection.":{"es":"Tu colección.","fr":"Votre collection.","pt":"Sua coleção."},"The stories you've experienced, and those still waiting.":{"es":"Las historias que viste y las que aún te esperan.","fr":"Les histoires que vous avez vues, et celles qui vous attendent.","pt":"As histórias que você viu e as que ainda esperam."},"Save changes":{"es":"Guardar cambios","fr":"Enregistrer","pt":"Salvar alterações"},"Remove from Watchlist":{"es":"Eliminar de la lista","fr":"Retirer de la liste","pt":"Remover da lista"},"Your impression":{"es":"Tu impresión","fr":"Votre impression","pt":"Sua impressão"},"Private note":{"es":"Nota privada","fr":"Note privée","pt":"Nota privada"},"Ask me every time (recommended)":{"es":"Preguntarme siempre (recomendado)","fr":"Toujours me demander (recommandé)","pt":"Perguntar sempre (recomendado)"},"No titles found. Try another search.":{"es":"No se encontraron títulos. Prueba otra búsqueda.","fr":"Aucun titre trouvé. Essayez une autre recherche.","pt":"Nenhum título encontrado. Tente outra busca."},"Selected":{"es":"Seleccionado","fr":"Sélectionné","pt":"Selecionado"},"Loading…":{"es":"Cargando…","fr":"Chargement…","pt":"Carregando…"},"Sign in to save your collection.":{"es":"Inicia sesión para guardar tu colección.","fr":"Connectez-vous pour enregistrer votre collection.","pt":"Entre para salvar sua coleção."},"Discussion":{"es":"Conversación","fr":"Discussion","pt":"Discussão"},"Reply":{"es":"Responder","fr":"Répondre","pt":"Responder"},"Post":{"es":"Publicar","fr":"Publier","pt":"Publicar"},"Public profile":{"es":"Perfil público","fr":"Profil public","pt":"Perfil público"},"Back":{"es":"Volver","fr":"Retour","pt":"Voltar"}};
let locale='en';
try{const v=localStorage.getItem(KEY);if(supported.includes(v))locale=v;}catch(_){}
const originals=new WeakMap();
const exclusions='script,style,noscript,svg,pre,code,textarea,[contenteditable],.discovery-artwork,.film-lead,.film-synopsis-lead,.film-title,.film-hero-title,.archive-card-title,.watchlist-reminder-card-title,.explore-pick h3,.catalog-tile-title,.poster figcaption,.film-share-title,.archive-feature-title,.film-credits,.film-fact-row dd,.discuss-post-body,.discussion-body,.member-bio,.archive-feature-note,.film-other-grid';
const clean=t=>t.trim().replace(/\s+/g,' ');
function translate(v){
 const trimmed=clean(v);
 if(!trimmed)return null;
 return translations[trimmed]?.[locale]||null;
}
function eligible(node){
 if(!node?.parentElement||node.parentElement.closest(exclusions))return false;
 return true;
}
function translateNode(node){
 if(!eligible(node))return;
 let record=originals.get(node);
 if(!record||node.nodeValue!==record.applied){
  record={original:node.nodeValue,applied:node.nodeValue};
 }
 const replacement=locale==='en'?record.original:translate(record.original);
 if(replacement!==null){
  const front=record.original.match(/^\s*/)?.[0]||'';
  const back=record.original.match(/\s*$/)?.[0]||'';
  const output=front+replacement+back;
  if(node.nodeValue!==output)node.nodeValue=output;
  record.applied=output;
 }else if(node.nodeValue!==record.original){
  node.nodeValue=record.original;record.applied=record.original;
 }
 originals.set(node,record);
}
const attributes=new WeakMap();
const attributeNames=['placeholder','aria-label','title'];
function translateAttrs(el){
 if(!el||el.nodeType!==1||el.matches(exclusions)||el.closest(exclusions))return;
 let original=attributes.get(el)||{};
 for(const name of attributeNames){
  if(!el.hasAttribute(name))continue;
  const current=el.getAttribute(name)||'';
  const record=original[name];
  if(!record||record.applied!==current)original[name]={original:current,applied:current};
  const value=original[name];
  const next=locale==='en'?value.original:(translate(value.original)||value.original);
  if(current!==next)el.setAttribute(name,next);
  value.applied=next;
 }
 attributes.set(el,original);
}
function apply(root){
 if(!root)return;
 document.documentElement.lang=locale;
 if(root.nodeType===3){translateNode(root);return;}
 if(root.nodeType!==1&&root.nodeType!==9)return;
 if(root.nodeType===1)translateAttrs(root);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(node.nodeType===3)translateNode(node);
  else translateAttrs(node);
 }
}
function setLanguage(next){
 if(!supported.includes(next))return;
 locale=next;
 try{localStorage.setItem(KEY,locale);}catch(_){}
 apply(document.body);
 for(const selector of document.querySelectorAll('.afterlogue-language-select'))selector.value=locale;
 document.dispatchEvent(new CustomEvent('afterlogue:language-changed',{detail:{locale}}));
}
function mount(){
 const header=document.querySelector('header');
 if(!header)return;
 const wrapper=document.createElement('label');
 wrapper.className='afterlogue-language-control';
 wrapper.setAttribute('aria-label','Website language');
 const globe=document.createElement('span');
 globe.className='afterlogue-language-globe';globe.textContent='◎';
 globe.setAttribute('aria-hidden','true');
 const select=document.createElement('select');
 select.className='afterlogue-language-select';
 select.setAttribute('aria-label','Website language');
 for(const lang of supported){
  const option=document.createElement('option');
  option.value=lang;option.textContent=names[lang];select.append(option);
 }
 select.value=locale;
 select.addEventListener('change',()=>setLanguage(select.value));
 wrapper.append(globe,select);
 const welcome=header.querySelector('.member-entry');
 const nav=header.querySelector('nav');
 if(welcome)welcome.prepend(wrapper);
 else if(nav){
  const account=nav.querySelector('.account-menu');
  if(account)account.before(wrapper);else nav.append(wrapper);
 }else header.append(wrapper);
 const style=document.createElement('style');
 style.textContent=`.afterlogue-language-control{display:inline-flex;align-items:center;justify-content:center;gap:5px;font:11px Inter,Arial,sans-serif;color:#d4b487;white-space:nowrap;flex:0 0 auto;min-width:0}
.afterlogue-language-globe{font:18px Georgia,serif;line-height:1;color:inherit}
.afterlogue-language-select{max-width:112px;min-width:70px;min-height:32px;padding:4px 15px 4px 3px;border:0;border-radius:0;background:transparent;color:#d4b487;font:11px Inter,Arial,sans-serif;cursor:pointer}
.afterlogue-language-select option{background:#202020;color:#eee}
.afterlogue-language-select:focus-visible{outline:1px solid #d4b487;outline-offset:2px}
.welcome-header .afterlogue-language-control{margin-right:4px}
@media(max-width:650px){
  header.site-header nav .afterlogue-language-control{display:inline-flex!important;flex:0 0 auto!important}
  .afterlogue-language-select{width:72px;min-width:0;max-width:72px;font-size:10px}
  .welcome-header .member-entry{gap:7px}
  .welcome-header .member-entry .afterlogue-language-select{width:91px;max-width:91px}
}
@media(max-width:390px){header.site-header nav .afterlogue-language-globe{display:none}}`;
 document.head.append(style);
}
let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;apply(document.body);});
}
function ready(){
 mount();
 apply(document.body);
 const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>m.type==='characterData'||m.type==='childList'||m.type==='attributes'))schedule();
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,
  attributes:true,attributeFilter:['placeholder','aria-label','title']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
else ready();
window.AfterlogueLanguage=Object.freeze({set:setLanguage,current:()=>locale,supported:[...supported]});
})();
