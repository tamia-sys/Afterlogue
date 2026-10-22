/* Afterlogue international interface, first language pack.
 * Locally translated UI, persisted per browser, applied across ALL site pages.
 * Film metadata, member writing and third-party synopses remain in their
 * original languages; do not label external/user content as translated.
 */
(()=>{
'use strict';
const KEY='afterlogue.ui-language.v1';
const supported=['en','es','fr','pt','ko'];
const names={en:'English',es:'Español',fr:'Français',pt:'Português',ko:'한국어'};
const translations={"Language":{"es":"Idioma","fr":"Langue","pt":"Idioma","ko":"언어"},"English":{"es":"Inglés","fr":"Anglais","pt":"Inglês","ko":"영어"},"Sign in":{"es":"Iniciar sesión","fr":"Se connecter","pt":"Entrar","ko":"로그인"},"Already a member?":{"es":"¿Ya tienes una cuenta?","fr":"Déjà membre ?","pt":"Já tem uma conta?","ko":"이미 회원이신가요?"},"Welcome to afterlogue.":{"es":"Te damos la bienvenida a afterlogue.","fr":"Bienvenue sur afterlogue.","pt":"Bem-vindo ao afterlogue.","ko":"애프터로그에 오신 것을 환영합니다."},"PERSONALIZED FILM & TV DISCOVERY":{"es":"DESCUBRE CINE Y SERIES A TU MEDIDA","fr":"DÉCOUVERTE PERSONNALISÉE DE FILMS ET SÉRIES","pt":"DESCOBERTA PERSONALIZADA DE FILMES E SÉRIES","ko":"취향에 맞는 영화·시리즈 발견"},"A more personal way to discover what to watch next.":{"es":"Una forma más personal de descubrir qué ver.","fr":"Une façon plus personnelle de choisir quoi regarder.","pt":"Uma forma mais pessoal de descobrir o que assistir.","ko":"다음에 볼 작품을 더 나답게 발견하는 방법."},"Create an account →":{"es":"Crear una cuenta →","fr":"Créer un compte →","pt":"Criar uma conta →","ko":"계정 만들기 →"},"Continue as guest":{"es":"Continuar como invitado","fr":"Continuer en invité","pt":"Continuar como visitante","ko":"게스트로 둘러보기"},"Personalized":{"es":"Personalizado","fr":"Personnalisé","pt":"Personalizado","ko":"맞춤 추천"},"Recommendations that evolve with you.":{"es":"Recomendaciones que evolucionan contigo.","fr":"Des recommandations qui évoluent avec vous.","pt":"Recomendações que evoluem com você.","ko":"취향과 함께 진화하는 추천."},"Find something for your mood, the moment, or the season.":{"es":"Encuentra algo para tu estado de ánimo, el momento o la estación.","fr":"Trouvez une histoire pour votre humeur, le moment ou la saison.","pt":"Encontre algo para seu humor, o momento ou a estação.","ko":"지금 기분과 순간, 계절에 어울리는 작품을 찾아보세요."},"Talk about films and shows with other viewers.":{"es":"Habla de películas y series con otros espectadores.","fr":"Parlez de films et de séries avec d'autres spectateurs.","pt":"Converse sobre filmes e séries com outras pessoas.","ko":"다른 사람들과 영화와 시리즈에 대해 이야기해 보세요."},"HOW IT WORKS":{"es":"CÓMO FUNCIONA","fr":"COMMENT ÇA MARCHE","pt":"COMO FUNCIONA","ko":"이용 방법"},"01 — FIRST IMPRESSIONS":{"es":"01 — PRIMERAS IMPRESIONES","fr":"01 — PREMIÈRES IMPRESSIONS","pt":"01 — PRIMEIRAS IMPRESSÕES","ko":"01 — 첫인상"},"02 — DISCOVERY":{"es":"02 — DESCUBRIMIENTO","fr":"02 — DÉCOUVERTE","pt":"02 — DESCOBERTA","ko":"02 — 작품 발견"},"03 — LOG":{"es":"03 — REGISTRO","fr":"03 — JOURNAL","pt":"03 — REGISTRO","ko":"03 — 나의 기록"},"Let's get acquainted":{"es":"Conozcámonos","fr":"Faisons connaissance","pt":"Vamos nos conhecer","ko":"먼저 취향을 알아볼까요?"},"Start with the films  and shows you know. Tell us what you thought.":{"es":"Empieza por películas y series que ya conoces. Cuéntanos qué te parecieron.","fr":"Commencez par des films et des séries que vous connaissez. Donnez votre avis.","pt":"Comece pelos filmes e séries que você conhece. Conte o que achou.","ko":"알고 있는 영화와 시리즈부터 시작해 보세요. 감상을 들려주세요."},"Find your next story":{"es":"Encuentra tu próxima historia","fr":"Trouvez votre prochaine histoire","pt":"Encontre sua próxima história","ko":"다음 이야기를 찾아보세요"},"Choose Movies or TV. Get five picks at a time.":{"es":"Elige cine o series. Recibe cinco sugerencias por vez.","fr":"Choisissez Films ou Séries. Découvrez cinq suggestions à la fois.","pt":"Escolha Filmes ou Séries. Receba cinco sugestões por vez.","ko":"영화 또는 TV 시리즈를 선택하세요. 한 번에 다섯 작품씩 추천해 드려요."},"The more you log, the better it gets":{"es":"Cuanto más registres, mejores serán tus recomendaciones","fr":"Plus vous notez, plus les suggestions s'affinent","pt":"Quanto mais você registra, melhores ficam as sugestões","ko":"기록할수록 더 잘 맞는 추천"},"Every title you log helps us make better picks for you.":{"es":"Cada título que registras nos ayuda a recomendarte mejor.","fr":"Chaque titre ajouté nous aide à mieux vous conseiller.","pt":"Cada título registrado nos ajuda a recomendar melhor.","ko":"작품을 기록할 때마다 취향을 더 잘 이해할 수 있어요."},"Recent Log":{"es":"Registro reciente","fr":"Journal récent","pt":"Registro recente","ko":"최근 기록"},"Loved":{"es":"Me encantó","fr":"Adoré","pt":"Amei","ko":"정말 좋았어요"},"Liked":{"es":"Me gustó","fr":"Aimé","pt":"Gostei","ko":"좋았어요"},"Okay":{"es":"Regular","fr":"Moyen","pt":"Mais ou menos","ko":"보통이에요"},"Not for me":{"es":"No es para mí","fr":"Pas pour moi","pt":"Não é para mim","ko":"제 취향은 아니에요"},"Movies":{"es":"Películas","fr":"Films","pt":"Filmes","ko":"영화"},"Movie":{"es":"Película","fr":"Film","pt":"Filme","ko":"영화"},"TV Shows":{"es":"Series","fr":"Séries","pt":"Séries","ko":"TV 시리즈"},"TV shows":{"es":"Series","fr":"Séries","pt":"Séries","ko":"TV 시리즈"},"Film":{"es":"Película","fr":"Film","pt":"Filme","ko":"영화"},"Films":{"es":"Películas","fr":"Films","pt":"Filmes","ko":"영화"},"TV series":{"es":"Serie","fr":"Série","pt":"Série","ko":"TV 시리즈"},"TV":{"es":"TV","fr":"Télé","pt":"TV","ko":"TV"},"Watched":{"es":"Vistas","fr":"Vus","pt":"Assistidos","ko":"본 작품"},"Watchlist":{"es":"Para ver","fr":"À regarder","pt":"Quero assistir","ko":"보고 싶은 작품"},"Favorites":{"es":"Favoritos","fr":"Favoris","pt":"Favoritos","ko":"즐겨찾기"},"The film ends. The conversation doesn't.":{"es":"La película termina. La conversación continúa.","fr":"Le film se termine. La conversation continue.","pt":"O filme termina. A conversa continua.","ko":"영화가 끝나도, 이야기는 계속됩니다."},"Home":{"es":"Inicio","fr":"Accueil","pt":"Início","ko":"홈"},"Explore":{"es":"Explorar","fr":"Explorer","pt":"Explorar","ko":"둘러보기"},"Log":{"es":"Registro","fr":"Journal","pt":"Registro","ko":"기록"},"Discuss":{"es":"Debatir","fr":"Discuter","pt":"Discutir","ko":"이야기 나누기"},"Your account":{"es":"Tu cuenta","fr":"Votre compte","pt":"Sua conta","ko":"내 계정"},"Edit profile":{"es":"Editar perfil","fr":"Modifier le profil","pt":"Editar perfil","ko":"프로필 수정"},"Account settings":{"es":"Configuración de la cuenta","fr":"Paramètres du compte","pt":"Configurações da conta","ko":"계정 설정"},"Sign out":{"es":"Cerrar sesión","fr":"Se déconnecter","pt":"Sair","ko":"로그아웃"},"Welcome back.":{"es":"Te damos la bienvenida.","fr":"Bon retour.","pt":"Bem-vindo de volta.","ko":"다시 오신 것을 환영해요."},"Make it yours.":{"es":"Hazlo tuyo.","fr":"À vous de jouer.","pt":"Faça do seu jeito.","ko":"나만의 공간을 만들어 보세요."},"Save your impressions.":{"es":"Guarda tus impresiones.","fr":"Enregistrez vos impressions.","pt":"Salve suas impressões.","ko":"감상을 저장해 보세요."},"Continue with Google":{"es":"Continuar con Google","fr":"Continuer avec Google","pt":"Continuar com Google","ko":"Google로 계속하기"},"Continue with Apple":{"es":"Continuar con Apple","fr":"Continuer avec Apple","pt":"Continuar com Apple","ko":"Apple로 계속하기"},"or continue with email":{"es":"o con tu correo electrónico","fr":"ou continuer par e-mail","pt":"ou continuar com e-mail","ko":"또는 이메일로 계속하기"},"Email":{"es":"Correo electrónico","fr":"E-mail","pt":"E-mail","ko":"이메일"},"Password":{"es":"Contraseña","fr":"Mot de passe","pt":"Senha","ko":"비밀번호"},"Create account →":{"es":"Crear cuenta →","fr":"Créer un compte →","pt":"Criar conta →","ko":"계정 만들기 →"},"Sign in →":{"es":"Iniciar sesión →","fr":"Se connecter →","pt":"Entrar →","ko":"로그인 →"},"New to Afterlogue?":{"es":"¿Eres nuevo en Afterlogue ?","fr":"Vous découvrez Afterlogue ?","pt":"Primeira vez no Afterlogue?","ko":"애프터로그가 처음이신가요?"},"Create account":{"es":"Crear cuenta","fr":"Créer un compte","pt":"Criar conta","ko":"계정 만들기"},"Sign in / Create account":{"es":"Inicia sesión / Crea una cuenta","fr":"Se connecter / Créer un compte","pt":"Entrar / Criar conta","ko":"로그인 / 계정 만들기"},"Resend confirmation":{"es":"Reenviar confirmación","fr":"Renvoyer la confirmation","pt":"Reenviar confirmação","ko":"인증 메일 다시 보내기"},"Opening your story.":{"es":"Abriendo tu historia.","fr":"Votre histoire s'ouvre.","pt":"Abrindo sua história.","ko":"이야기를 열고 있어요."},"A world of":{"es":"Un mundo de","fr":"Un monde de","pt":"Um mundo de","ko":"새로운 이야기의"},"stories awaits.":{"es":"historias te espera.","fr":"récits vous attend.","pt":"histórias espera por você.","ko":"세계가 기다립니다."},"A world of stories awaits.":{"es":"Te espera un mundo de historias.","fr":"Tout un monde d'histoires vous attend.","pt":"Um mundo de histórias espera por você.","ko":"새로운 이야기의 세계가 기다립니다."},"Discover again":{"es":"Descubrir más","fr":"Découvrir encore","pt":"Descobrir novamente","ko":"다시 발견하기"},"Discover another selection →":{"es":"Descubrir otra selección →","fr":"Découvrir une autre sélection →","pt":"Descobrir outra seleção →","ko":"새로운 추천 보기 →"},"Selected for you.":{"es":"Selección para ti.","fr":"Sélection pour vous.","pt":"Seleção para você.","ko":"당신을 위한 선택."},"Five recommendations shaped by your taste.":{"es":"Cinco recomendaciones según tus gustos.","fr":"Cinq recommandations selon vos goûts.","pt":"Cinco recomendações para o seu gosto.","ko":"취향에 맞춘 다섯 가지 추천."},"Your first impressions will shape what comes next.":{"es":"Tus primeras impresiones darán forma a las próximas sugerencias.","fr":"Vos premières impressions guideront les prochaines suggestions.","pt":"Suas primeiras impressões vão guiar as próximas sugestões.","ko":"첫인상을 바탕으로 다음 작품을 추천해 드려요."},"AFTERLOGUE / A LITTLE REMINDER":{"es":"AFTERLOGUE / UN RECORDATORIO","fr":"AFTERLOGUE / UN PETIT RAPPEL","pt":"AFTERLOGUE / UM LEMBRETE","ko":"애프터로그 / 작은 알림"},"A story already waiting.":{"es":"Una historia que te espera.","fr":"Une histoire qui vous attend déjà.","pt":"Uma história à sua espera.","ko":"이미 기다리고 있는 이야기."},"A story you saved might be just what you're looking for.":{"es":"Quizás una historia que guardaste sea justo lo que buscas.","fr":"Une histoire enregistrée est peut-être exactement ce qu'il vous faut.","pt":"Uma história salva pode ser exatamente o que você procura.","ko":"저장해 둔 작품이 지금 보고 싶은 바로 그 작품일지도 몰라요."},"Something from your collection, perhaps?":{"es":"¿Algo de tu colección, quizás?","fr":"Et si vous puisiez dans votre collection ?","pt":"Que tal algo da sua coleção?","ko":"내 컬렉션에서 골라볼까요?"},"Another three ↻":{"es":"Otras tres ↻","fr":"Trois autres ↻","pt":"Mais três ↻","ko":"다른 세 작품 ↻"},"View Watchlist ↗":{"es":"Ver lista para ver ↗","fr":"Voir ma liste ↗","pt":"Ver lista ↗","ko":"보고 싶은 작품 보기 ↗"},"Your Watchlist couldn't be loaded. Please try again.":{"es":"No se pudo cargar tu lista. Inténtalo de nuevo.","fr":"Impossible de charger votre liste. Réessayez.","pt":"Não foi possível carregar sua lista. Tente novamente.","ko":"보고 싶은 작품 목록을 불러오지 못했어요. 다시 시도해 주세요."},"Sign in to revisit stories from your private Watchlist.":{"es":"Inicia sesión para volver a los títulos de tu lista privada.","fr":"Connectez-vous pour retrouver les titres de votre liste privée.","pt":"Entre para rever os títulos da sua lista privada.","ko":"저장한 작품을 다시 보려면 로그인해 주세요."},"Finding a few stories you saved…":{"es":"Buscando algunas historias que guardaste…","fr":"Recherche de quelques histoires enregistrées…","pt":"Buscando algumas histórias salvas…","ko":"저장한 작품을 살펴보고 있어요…"},"Opening your Watchlist…":{"es":"Abriendo tu lista…","fr":"Ouverture de votre liste…","pt":"Abrindo sua lista…","ko":"보고 싶은 작품 목록을 열고 있어요…"},"Three stories from your Watchlist, picked for a second look.":{"es":"Tres títulos de tu lista para volver a descubrir.","fr":"Trois titres de votre liste à redécouvrir.","pt":"Três títulos da sua lista para redescobrir.","ko":"보고 싶은 작품 중 다시 눈여겨볼 세 작품을 골랐어요."},"A story worth sharing.":{"es":"Una historia para compartir.","fr":"Une histoire à partager.","pt":"Uma história para compartilhar.","ko":"함께 나누고 싶은 이야기."},"Go to my Log":{"es":"Ir a mi registro","fr":"Ouvrir mon journal","pt":"Ir para meu registro","ko":"내 기록으로 이동"},"Share card ↗":{"es":"Compartir tarjeta ↗","fr":"Partager la carte ↗","pt":"Compartilhar cartão ↗","ko":"카드 공유 ↗"},"PASS THE STORY ALONG":{"es":"COMPARTE LA HISTORIA","fr":"FAITES PASSER L'HISTOIRE","pt":"COMPARTILHE A HISTÓRIA","ko":"이 이야기를 전해 보세요"},"Share story ↗":{"es":"Compartir historia ↗","fr":"Partager l'histoire ↗","pt":"Compartilhar história ↗","ko":"작품 공유 ↗"},"Copy link":{"es":"Copiar enlace","fr":"Copier le lien","pt":"Copiar link","ko":"링크 복사"},"Watch trailer":{"es":"Ver tráiler","fr":"Voir la bande-annonce","pt":"Ver trailer","ko":"예고편 보기"},"Seen it":{"es":"Ya la vi","fr":"Déjà vu","pt":"Já vi","ko":"봤어요"},"Add to Watchlist":{"es":"Añadir a mi lista","fr":"Ajouter à ma liste","pt":"Adicionar à lista","ko":"보고 싶은 작품에 추가"},"＋ Add to Watchlist":{"es":"＋ Añadir a mi lista","fr":"＋ Ajouter à ma liste","pt":"＋ Adicionar à lista","ko":"＋ 보고 싶은 작품에 추가"},"＋ Sign in to save":{"es":"＋ Inicia sesión para guardar","fr":"＋ Connectez-vous pour enregistrer","pt":"＋ Entre para salvar","ko":"＋ 저장하려면 로그인"},"✓ In your Watchlist":{"es":"✓ En tu lista","fr":"✓ Dans votre liste","pt":"✓ Na sua lista","ko":"✓ 보고 싶은 작품에 저장됨"},"Saved to your Watchlist.":{"es":"Guardado en tu lista.","fr":"Ajouté à votre liste.","pt":"Salvo na sua lista.","ko":"보고 싶은 작품에 저장했어요."},"Saved to your Watchlist. Welcome back to your story.":{"es":"Guardado en tu lista. Ya puedes volver a tu historia.","fr":"Ajouté à votre liste. Retrouvez votre histoire.","pt":"Salvo na sua lista. Sua história está aqui.","ko":"보고 싶은 작품에 저장했어요. 다시 이 이야기로 돌아왔네요."},"Saved to your Watchlist. This story will no longer appear in Home recommendations.":{"es":"Guardado en tu lista. Ya no aparecerá entre las recomendaciones de Inicio.","fr":"Ajouté à votre liste. Cette histoire ne figurera plus dans les recommandations de l'accueil.","pt":"Salvo na sua lista. Esta história não aparecerá mais nas recomendações do Início.","ko":"보고 싶은 작품에 저장했어요. 이 작품은 이제 홈 추천에 나타나지 않아요."},"Removed from your Watchlist.":{"es":"Eliminado de tu lista.","fr":"Retiré de votre liste.","pt":"Removido da sua lista.","ko":"보고 싶은 작품에서 삭제했어요."},"Already in your Watchlist.":{"es":"Ya está en tu lista.","fr":"Déjà dans votre liste.","pt":"Já está na sua lista.","ko":"이미 보고 싶은 작품에 있어요."},"Story details":{"es":"Detalles","fr":"Détails","pt":"Detalhes","ko":"작품 정보"},"More story options":{"es":"Más opciones","fr":"Autres options","pt":"Mais opções","ko":"작품 더보기"},"View details":{"es":"Ver detalles","fr":"Voir les détails","pt":"Ver detalhes","ko":"자세히 보기"},"Details":{"es":"Detalles","fr":"Détails","pt":"Detalhes","ko":"상세 정보"},"Back to Discover":{"es":"Volver a Descubrir","fr":"Retour aux découvertes","pt":"Voltar à descoberta","ko":"작품 발견으로 돌아가기"},"← Back to Discover":{"es":"← Volver a Descubrir","fr":"← Retour aux découvertes","pt":"← Voltar à descoberta","ko":"← 작품 발견으로 돌아가기"},"The conversation continues.":{"es":"La conversación continúa.","fr":"La conversation continue.","pt":"A conversa continua.","ko":"이야기는 계속됩니다."},"Save":{"es":"Guardar","fr":"Enregistrer","pt":"Salvar","ko":"저장"},"＋ Save":{"es":"＋ Guardar","fr":"＋ Enregistrer","pt":"＋ Salvar","ko":"＋ 저장"},"✓ Saved":{"es":"✓ Guardado","fr":"✓ Enregistré","pt":"✓ Salvo","ko":"✓ 저장됨"},"Another selection ↗":{"es":"Otra selección ↗","fr":"Une autre sélection ↗","pt":"Outra seleção ↗","ko":"다른 추천 보기 ↗"},"Try again ↗":{"es":"Reintentar ↗","fr":"Réessayer ↗","pt":"Tentar novamente ↗","ko":"다시 시도 ↗"},"Find my stories →":{"es":"Encontrar mis historias →","fr":"Trouver mes histoires →","pt":"Encontrar minhas histórias →","ko":"내 추천 작품 찾기 →"},"What would you like to watch?":{"es":"¿Qué te gustaría ver?","fr":"Qu'aimeriez-vous regarder ?","pt":"O que gostaria de assistir?","ko":"어떤 작품을 보고 싶으세요?"},"What pace feels right?":{"es":"¿Qué ritmo te apetece?","fr":"Quel rythme vous convient ?","pt":"Qual ritmo combina com você?","ko":"어떤 전개 속도가 좋으세요?"},"A film":{"es":"Una película","fr":"Un film","pt":"Um filme","ko":"영화 한 편"},"A TV show":{"es":"Una serie","fr":"Une série","pt":"Uma série","ko":"TV 시리즈"},"Either one":{"es":"Cualquiera","fr":"Les deux me vont","pt":"Tanto faz","ko":"둘 다 좋아요"},"One story, one sitting.":{"es":"Una historia para una sesión.","fr":"Une histoire en une séance.","pt":"Uma história de uma vez.","ko":"한 번에 한 편의 이야기를 즐겨요."},"Something to spend a little longer with.":{"es":"Algo para disfrutar durante más tiempo.","fr":"Une histoire à suivre plus longtemps.","pt":"Algo para acompanhar por mais tempo.","ko":"조금 더 오래 함께할 이야기를 원해요."},"I'll go where the story takes me.":{"es":"Me dejaré llevar por la historia.","fr":"Je me laisse guider par l'histoire.","pt":"Vou aonde a história me levar.","ko":"이야기가 이끄는 대로 따라갈래요."},"Take your time":{"es":"Sin prisa","fr":"Prenez votre temps","pt":"Sem pressa","ko":"천천히 즐기기"},"Somewhere between":{"es":"Algo intermedio","fr":"Entre les deux","pt":"Um pouco dos dois","ko":"적당한 속도"},"Keep me on my toes":{"es":"Que me sorprenda","fr":"Surprenez-moi","pt":"Me surpreenda","ko":"긴장감 있게"},"Quiet, reflective, unhurried.":{"es":"Tranquilo, reflexivo, sin prisa.","fr":"Calme, contemplatif, sans hâte.","pt":"Calmo, reflexivo, sem pressa.","ko":"차분하고 사색적이며 느긋하게."},"A bit of everything.":{"es":"Un poco de todo.","fr":"Un peu de tout.","pt":"Um pouco de tudo.","ko":"다양한 분위기를 조금씩."},"Energy, tension, momentum.":{"es":"Energía, tensión, movimiento.","fr":"Énergie, tension, rythme.","pt":"Energia, tensão, movimento.","ko":"에너지와 긴장감, 빠른 전개."},"Something for your mood.":{"es":"Algo para tu estado de ánimo.","fr":"Une histoire pour votre humeur.","pt":"Algo para seu humor.","ko":"지금 기분에 어울리는 이야기."},"Save a story":{"es":"Guardar una historia","fr":"Enregistrer une histoire","pt":"Salvar uma história","ko":"작품 저장하기"},"Your collection":{"es":"Tu colección","fr":"Votre collection","pt":"Sua coleção","ko":"나의 컬렉션"},"Your first impressions guide your personalized experience.":{"es":"Tus primeras impresiones guían tu experiencia personal.","fr":"Vos premières impressions guident votre expérience.","pt":"Suas primeiras impressões guiam sua experiência.","ko":"첫인상이 나만의 추천을 만들어 줍니다."},"Continue →":{"es":"Continuar →","fr":"Continuer →","pt":"Continuar →","ko":"계속 →"},"Skip for now →":{"es":"Omitir por ahora →","fr":"Passer pour l'instant →","pt":"Pular por enquanto →","ko":"지금은 건너뛰기 →"},"About 2 minutes":{"es":"Unos 2 minutos","fr":"Environ 2 minutes","pt":"Cerca de 2 minutos","ko":"약 2분"},"First Impressions":{"es":"Primeras impresiones","fr":"Premières impressions","pt":"Primeiras impressões","ko":"첫인상"},"Tell us what you think":{"es":"Cuéntanos qué opinas","fr":"Donnez votre avis","pt":"Conte o que achou","ko":"감상을 알려주세요"},"Search films and TV":{"es":"Buscar películas y series","fr":"Rechercher des films et des séries","pt":"Buscar filmes e séries","ko":"영화와 TV 시리즈 검색"},"Films & TV":{"es":"Películas y series","fr":"Films et séries","pt":"Filmes e séries","ko":"영화 및 TV 시리즈"},"Search titles…":{"es":"Buscar títulos…","fr":"Rechercher des titres…","pt":"Buscar títulos…","ko":"작품 검색…"},"Selected / 001":{"es":"Selección / 001","fr":"Sélection / 001","pt":"Seleção / 001","ko":"선정 / 001"},"Your collection.":{"es":"Tu colección.","fr":"Votre collection.","pt":"Sua coleção.","ko":"나의 컬렉션."},"The stories you've experienced, and those still waiting.":{"es":"Las historias que viste y las que aún te esperan.","fr":"Les histoires que vous avez vues, et celles qui vous attendent.","pt":"As histórias que você viu e as que ainda esperam.","ko":"이미 만난 이야기와 앞으로 만날 이야기."},"Save changes":{"es":"Guardar cambios","fr":"Enregistrer","pt":"Salvar alterações","ko":"변경 사항 저장"},"Remove from Watchlist":{"es":"Eliminar de la lista","fr":"Retirer de la liste","pt":"Remover da lista","ko":"보고 싶은 작품에서 삭제"},"Your impression":{"es":"Tu impresión","fr":"Votre impression","pt":"Sua impressão","ko":"나의 감상"},"Private note":{"es":"Nota privada","fr":"Note privée","pt":"Nota privada","ko":"비공개 메모"},"Ask me every time (recommended)":{"es":"Preguntarme siempre (recomendado)","fr":"Toujours me demander (recommandé)","pt":"Perguntar sempre (recomendado)","ko":"매번 확인하기 (권장)"},"No titles found. Try another search.":{"es":"No se encontraron títulos. Prueba otra búsqueda.","fr":"Aucun titre trouvé. Essayez une autre recherche.","pt":"Nenhum título encontrado. Tente outra busca.","ko":"작품을 찾지 못했어요. 다른 검색어를 입력해 보세요."},"Selected":{"es":"Seleccionado","fr":"Sélectionné","pt":"Selecionado","ko":"선택됨"},"Loading…":{"es":"Cargando…","fr":"Chargement…","pt":"Carregando…","ko":"불러오는 중…"},"Sign in to save your collection.":{"es":"Inicia sesión para guardar tu colección.","fr":"Connectez-vous pour enregistrer votre collection.","pt":"Entre para salvar sua coleção.","ko":"컬렉션을 저장하려면 로그인해 주세요."},"Discussion":{"es":"Conversación","fr":"Discussion","pt":"Discussão","ko":"토론"},"Reply":{"es":"Responder","fr":"Répondre","pt":"Responder","ko":"답글"},"Post":{"es":"Publicar","fr":"Publier","pt":"Publicar","ko":"게시"},"Public profile":{"es":"Perfil público","fr":"Profil public","pt":"Perfil público","ko":"공개 프로필"},"Back":{"es":"Volver","fr":"Retour","pt":"Voltar","ko":"뒤로"},"Website language":{"ko":"사이트 언어"},"Select language":{"ko":"언어 선택"},"한국어":{"ko":"한국어"},"Open account menu":{"ko":"계정 메뉴 열기"},"Open your account menu":{"ko":"계정 메뉴 열기"},"Close account menu":{"ko":"계정 메뉴 닫기"},"Browsing as guest":{"ko":"게스트로 둘러보는 중"},"Sign in to save your stories.":{"ko":"작품을 저장하려면 로그인해 주세요."},"Enjoy a little look around Afterlogue.":{"ko":"애프터로그를 자유롭게 둘러보세요."},"Create an account to save your stories.":{"ko":"작품을 저장하려면 계정을 만들어 주세요."},"You're signed in. Opening Afterlogue…":{"ko":"로그인했어요. 애프터로그를 열고 있어요…"},"Opening your story…":{"ko":"이야기를 열고 있어요…"},"Signing in…":{"ko":"로그인 중…"},"Creating account…":{"ko":"계정을 만드는 중…"},"Save your story":{"ko":"작품 저장하기"},"Watch trailer ↗":{"ko":"예고편 보기 ↗"},"Saved. Won't appear in future Home selections.":{"ko":"저장했어요. 다음 홈 추천에는 나타나지 않아요."},"About two minutes":{"ko":"약 2분"},"Explore by mood":{"ko":"기분에 따라 둘러보기"},"Explore by mood.":{"ko":"기분에 따라 둘러보기."},"All Films & TV":{"ko":"전체 영화 및 TV 시리즈"},"All films & TV":{"ko":"전체 영화 및 TV 시리즈"},"All Films and TV":{"ko":"전체 영화 및 TV 시리즈"},"All films and TV":{"ko":"전체 영화 및 TV 시리즈"},"Open the full library":{"ko":"전체 작품 둘러보기"},"Find your next story.":{"ko":"다음 이야기를 찾아보세요."},"Find your perspective.":{"ko":"나만의 시선을 찾아보세요."},"Your personal Log awaits.":{"ko":"나만의 작품 기록이 기다리고 있어요."},"Thoughtful picks shaped by your taste.":{"ko":"취향을 반영한 세심한 추천."},"Five stories selected with you in mind.":{"ko":"당신의 취향을 생각하며 고른 다섯 작품."},"SELECTED / 001":{"ko":"선정 / 001"},"SELECTED / 005":{"ko":"선정 / 005"},"SELECTED / 000":{"ko":"선정 / 000"},"YOUR COLLECTION":{"ko":"나의 컬렉션"},"AFTERLOGUE / 03 — YOUR COLLECTION":{"ko":"애프터로그 / 03 — 나의 컬렉션"},"AFTERLOGUE / PERSONAL DETAILS":{"ko":"애프터로그 / 작품 기록 상세"},"AFTERLOGUE / SHARE":{"ko":"애프터로그 / 공유"},"View in Log":{"ko":"기록에서 보기"},"View Watchlist":{"ko":"보고 싶은 작품 보기"},"Watchlist saved":{"ko":"보고 싶은 작품에 저장했어요"},"View details ↗":{"ko":"상세 정보 ↗"},"Saved for later":{"ko":"나중에 보려고 저장함"},"Seen · No impression yet":{"ko":"봤어요 · 아직 감상 없음"},"Films and shows":{"ko":"영화와 TV 시리즈"},"Films and TV":{"ko":"영화와 TV 시리즈"},"Choose a mood":{"ko":"기분을 선택해 주세요"},"Find my stories":{"ko":"내 추천 작품 찾기"},"Maybe later":{"ko":"나중에"},"Try something new":{"ko":"새로운 작품 만나기"},"Something unexpected":{"ko":"예상 밖의 이야기"},"Surprise me":{"ko":"깜짝 추천"},"Your Watchlist is empty.":{"ko":"보고 싶은 작품 목록이 비어 있어요."},"No titles found.":{"ko":"작품을 찾지 못했어요."},"Submit":{"ko":"제출"},"Cancel":{"ko":"취소"},"Close":{"ko":"닫기"},"Search":{"ko":"검색"},"Loading your collection…":{"ko":"컬렉션을 불러오는 중…"},"OPENING YOUR STORY":{"ko":"이야기를 열고 있어요"}};
// Normalize legacy phrase keys containing doubled whitespace, so longer
// translated sentences match the actual visible UI text.
for(const key of Object.keys(translations)){
 const normalized=key.replace(/\s+/g,' ').trim();
 if(normalized!==key&&!translations[normalized])translations[normalized]=translations[key];
}
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
  const front=record.original.match(/^\\s*/)?.[0]||'';
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
html[lang="ko"] body{font-family:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",Inter,Arial,sans-serif}
html[lang="ko"] .intro h1,
html[lang="ko"] .discover-intro h1,
html[lang="ko"] .discovery-section-header h2,
html[lang="ko"] .watchlist-reminder h2,
html[lang="ko"] .signup-container h1,
html[lang="ko"] .archive-title,
html[lang="ko"] .step-intro h3{
 font-family:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",Arial,sans-serif;
 letter-spacing:-.025em;line-height:1.28;word-break:keep-all
}
html[lang="ko"] .afterlogue-language-select{font-family:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",Arial,sans-serif}

@media(max-width:650px){
  header.site-header nav .afterlogue-language-control{display:inline-flex!important;flex:0 0 auto!important}
  .afterlogue-language-select{width:82px;min-width:0;max-width:82px;font-size:10px}
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
