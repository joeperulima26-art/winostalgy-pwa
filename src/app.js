import {Jellyfin,moveActiveFirst} from './api.js';
import {loadConfig} from './config.js';
import {createPages} from './pages.js';
import {VERSION} from './version.js';
import {nextIndex,PlaybackReporter} from './playback.js';
const $=s=>document.querySelector(s), view=$('#view'), audio=$('#audio');
const paths={back:'m14 5-7 7 7 7',clock:'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',stats:'M5 20V10M12 20V4M19 20V7',mail:'M3 5h18v14H3zM3 5l9 7 9-7',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',info:'M12 11v6M12 7v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',coffee:'M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 9h3a3 3 0 0 1 0 6h-3M2 23h18M7 2v3M12 1v4',edit:'m4 16 12-12 4 4-12 12-5 1z',logout:'M9 4H3v16h6M9 12h12M17 8l4 4-4 4',home:'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',search:'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',library:'M4 3v18M9 3v18M14 4l5-1 3 17-5 1z',plus:'M12 4v16M4 12h16',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3',play:'m8 4 12 8-12 8z',pause:'M8 4v16M16 4v16',next:'m4 4 12 8-12 8zM20 4v16',previous:'m20 4-12 8 12 8zM4 4v16',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',mix:'M3 7h4l10 10h4M3 17h4l10-10h4M18 4l3 3-3 3M18 14l3 3-3 3',more:'M12 4v1M12 11v1M12 18v1',cloud:'M7 18a5 5 0 1 1 0-10 6 6 0 0 1 12 1 4.5 4.5 0 0 1 0 9z',radio:'M12 12v9M8 21h8M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M4 4a12 12 0 0 0 0 16M20 4a12 12 0 0 1 0 16'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.play}"/></svg>`;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function button(text,fn,cls){const b=el('button',text,cls);b.type='button';b.onclick=()=>run(b,fn);return b;}
function action(name,label,fn){const b=button('',fn);b.innerHTML=icon(name);b.setAttribute('aria-label',label);return b;}
let repeat='off',shuffle=false,reported=false,lastReport=0,reportWarned=false;
const reporter=new PlaybackReporter(()=>{if(!reportWarned){notice('La música continúa, pero no se pudo actualizar el historial de Jellyfin.');reportWarned=true;}});
let timer;function notice(text){$('#notice').textContent=text;clearTimeout(timer);timer=setTimeout(()=>$('#notice').textContent='',7000);}
async function run(b,fn){if(b.disabled)return;b.disabled=true;try{await fn();}catch(e){if(e.name!=='AbortError')notice(e.message);}finally{b.disabled=false;}}
let device=localStorage.getItem('winostalgy.device');if(!device){device=crypto.randomUUID();localStorage.setItem('winostalgy.device',device);}
let saved;try{saved=JSON.parse(localStorage.getItem('winostalgy.session') || sessionStorage.getItem('winostalgy.session') || 'null');}catch{}
let api;try{if(saved)api=new Jellyfin(saved.server,device,saved);}catch{}
let source='cloud', category='Audio', query='', items=[],offset=0,total=0,queue=[],position=-1,current=null,generation=0,controller,mixing=false;
const page=()=>location.hash.slice(1)||'inicio';
const session=()=>api?.session;
function modal(...nodes){const box=$('#dialog-content');box.replaceChildren(...nodes);if(!$('#dialog').open)$('#dialog').showModal();}
$('#close').onclick=()=>$('#dialog').close();
function field(label,type='text',value=''){const l=el('label',label),i=el('input');i.type=type;i.value=value;l.append(i);return [l,i];}
let radioApi='https://de1.api.radio-browser.info';
function applyConfig(config){radioApi=config.radioApi;if(!localStorage.getItem('winostalgy.country'))localStorage.setItem('winostalgy.country',config.country);}
function welcome(){
 const section=el('section',undefined,'welcome');const art=el('img');art.src='./assets/about-hero.webp';art.alt='Winostalgy · Música que nunca se olvida';art.className='welcome-art';
 const explore=button('',cloudChoice,'welcome-cloud');explore.innerHTML=icon('cloud');const text=el('span');text.append(el('strong','Explorar Winostalgy Nube'),el('small','Descubre nuestra colección de música en la nube'));explore.append(text,el('span','→'));
 const local=button('Usar Winostalgy →',()=>{source='radio';render();},'welcome-link');
 section.append(art,el('p','TU MÚSICA, TU ESTILO','eyebrow'),explore,el('p','o','separator'),local,el('p','Tus radios y tu propio servidor.'),button('Configurar mi servidor Jellyfin',connect,'text-link'),el('p','Puedes cambiarlo después en Configuración.'));view.append(section);
}
async function cloudChoice(){
 const keep=el('input');keep.type='checkbox';keep.checked=true;const remember=el('label','Mantener sesión en este dispositivo','check');remember.prepend(keep);
 const status=el('p','Leyendo configuración…','loading');modal(el('h2','Explorar Winostalgy Nube'),status);
 try{const config=await loadConfig();applyConfig(config);if(!status.isConnected)return;
 const personal=button('Personalizado · Tu propia experiencia',()=>googleLogin(new Jellyfin(config.server,device),keep.checked),'primary');
 const shared=button('Continuar como compartido →',async()=>{if(!config.demoEnabled||!config.user||!config.password)throw new Error('El acceso compartido no está habilitado en la configuración remota.');status.textContent='Iniciando acceso compartido…';const client=new Jellyfin(config.server,device);await client.login(config.user,config.password);client.session.mode='shared';client.session.name='Invitado · Compartido';await enter(client,keep.checked);$('#dialog').close();},'welcome-link');
 modal(el('h2','Explorar Winostalgy Nube'),el('p','Elige cómo quieres escuchar.'),personal,el('p','Tus propios Me gusta y playlists con Google.'),remember,el('p','o','separator'),shared,el('p','Compartido permite explorar y reproducir, sin guardar preferencias en Jellyfin.'));
 }catch(e){status.className='';status.textContent=e.message;$('#dialog-content').append(button('Reintentar',cloudChoice),button('Configurar mi servidor',connect));}
}
function connect(){
 const form=el('form'),[sl,server]=field('Servidor Jellyfin','url',session()?.server || 'https://spt.qarasmart.com'),[ul,user]=field('Usuario'),[pl,password]=field('Contraseña','password');server.required=user.required=true;user.autocomplete='username';password.autocomplete='current-password';
 const keep=el('input');keep.type='checkbox';const remember=el('label','Mantener sesión en este dispositivo','check');remember.prepend(keep);
 const message=el('p');message.setAttribute('role','alert');const submit=el('button','Conectar a Nube','primary');submit.type='submit';
 form.append(sl,ul,pl,remember,submit,message);
 form.onsubmit=e=>{e.preventDefault();run(submit,async()=>{message.textContent='Conectando…';try{const client=new Jellyfin(server.value,device);await client.login(user.value,password.value);password.value='';await enter(client,keep.checked);$('#dialog').close();}catch(err){message.textContent=err.message;}});};
 const google=button('Personalizado · Continuar con Google',async()=>{const client=new Jellyfin(server.value,device);await googleLogin(client,keep.checked);});
 modal(el('h2','Conectar a Nube'),el('p','Usa tu cuenta de Jellyfin o tu acceso personalizado.'),form,google,el('p','En un dispositivo compartido, deja desactivada la opción de mantener sesión.'));
}
async function enter(client,persist){reporter.stop(audio.currentTime);reported=false;audio.pause();audio.removeAttribute('src');current=null;queue=[];$('#player').hidden=true;api=client;localStorage.removeItem('winostalgy.session');sessionStorage.removeItem('winostalgy.session');(persist?localStorage:sessionStorage).setItem('winostalgy.session',JSON.stringify(client.session));category='Audio';source='cloud';query='';location.hash='inicio';await render();}
let googleScript;
async function googleLogin(client,persist){
 // Google requires a referrer/origin for local HTTP OAuth. API and artwork keep no-referrer.
 if(location.protocol==='http:' && ['localhost','127.0.0.1'].includes(location.hostname)) document.querySelector('meta[name="referrer"]').content='no-referrer-when-downgrade';
 const challenge=await client.request('JellyUploader/api/auth/challenge',{method:'POST',body:{DeviceId:device}});
 if(!googleScript)googleScript=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>{s.remove();googleScript=null;reject(new Error('No se pudo cargar el acceso de Google.'));};document.head.append(s);});
 await googleScript;const target=el('div'),msg=el('p','Selecciona tu cuenta de Google.');
 modal(el('h2','Tu propia experiencia'),msg,target);
 google.accounts.id.initialize({client_id:challenge.clientId,nonce:challenge.nonce,callback:async response=>{msg.textContent='Iniciando sesión…';try{client.accept(await client.request('JellyUploader/api/auth/google',{method:'POST',body:{DeviceId:device,Nonce:challenge.nonce,IdToken:response.credential}}));await enter(client,persist);$('#dialog').close();}catch(e){msg.textContent=e.message+' Cierra y vuelve a intentar para renovar el acceso.';}}});
 google.accounts.id.renderButton(target,{theme:'filled_black',size:'large',text:'continue_with'});
}
function navigate(route){$('#dialog').close();if(page()===route)render();else location.hash=route;}
const pages=createPages({el,button,icon,view,api:()=>api,session,navigate,connect,notice});
async function logout(){
 const previous=api;const status=el('p','Cerrando sesión…','loading');modal(el('h2','Cerrar sesión'),status);generation++;controller?.abort();await reporter.stop(audio.currentTime);reported=false;audio.pause();audio.removeAttribute('src');audio.load();queue=[];current=null;api=null;items=[];$('#player').hidden=true;localStorage.removeItem('winostalgy.session');sessionStorage.removeItem('winostalgy.session');if('mediaSession'in navigator)navigator.mediaSession.metadata=null;
 let failed=false;try{await previous.request('Sessions/Logout',{method:'POST',signal:AbortSignal.timeout(5000)});}catch{failed=true;}
 $('#dialog').close();location.hash='inicio';await render();notice(failed?'Sesión local cerrada. No se pudo notificar al servidor.':'Sesión cerrada.');
}
function profile(){
 const title=el('div',undefined,'profile-title'),back=action('back','Volver',()=>$('#dialog').close());title.append(back,el('h2','Perfil'));
 const identity=el('div',undefined,'profile-identity'),avatar=el('div',undefined,'avatar');avatar.innerHTML=icon('user');const text=el('div');text.append(el('strong',session()?.name||'Winostalgy'),el('small',session()?.email|| (session()?.mode==='shared'?'Acceso compartido':'Tu música, tu estilo')));identity.append(avatar,text);
 const menu=el('div',undefined,'profile-menu');const row=(ico,name,subtitle,fn)=>{const b=button('',fn,'profile-row');b.innerHTML=icon(ico);const t=el('span');t.append(el('strong',name));if(subtitle)t.append(el('small',subtitle));b.append(t,el('span','›'));menu.append(b);return b;};
 row('clock','Recientes','',()=>{source='cloud';pendingCategory='Recent';if(page()==='biblioteca'){category='Recent';pendingCategory=null;$('#dialog').close();render();}else navigate('biblioteca');});
 row('stats','Estadísticas','Datos de tu cuenta',()=>navigate('estadisticas'));
 const messages=row('mail','Mensajes','Próximamente',()=>{});messages.disabled=true;
 row('settings','Configuración','Fuentes y preferencias',()=>navigate('configuracion'));
 row('info','Acerca de','Versión y licencias',()=>navigate('acerca'));
 const footer=el('div',undefined,'profile-footer');if(session()){const exit=button('Cerrar sesión',logout,'logout-button');exit.prepend(document.createRange().createContextualFragment(icon('logout')));footer.append(exit);}
 modal(title,identity,menu,footer);const client=api;
 if(client&&client.session.mode!=='shared'){
 client.request('JellyUploader/api/session').then(rights=>{if(!menu.isConnected||api!==client||!rights.canEdit)return;row('edit','Editar música','Abrir JellyUploader',()=>{const a=el('a','Abrir gestor de música ↗');a.href=client.server+'/JellyUploader';a.target='_blank';a.rel='noopener noreferrer';modal(el('h2','Editar música'),el('p','El gestor existente de JellyUploader se abre en otra pestaña. Inicia sesión allí si te lo solicita.'),a);});}).catch(()=>{});
 client.request('Users/'+encodeURIComponent(client.session.userId)).then(user=>{if(!identity.isConnected||api!==client)return;const email=user.Email||(/^.+@.+$/.test(user.Name||'')?user.Name:'');if(email)text.lastChild.textContent=email;if(user.PrimaryImageTag){const image=el('img');image.alt='';image.src=client.url(`Users/${encodeURIComponent(client.session.userId)}/Images/Primary`,{tag:user.PrimaryImageTag,api_key:client.session.token}).href;image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();avatar.append(image);}}).catch(()=>{});
 }
}
$('#profile').innerHTML=icon('user');$('#profile').onclick=profile;

for(const [key,label,ico] of [['inicio','Inicio','home'],['explorar','Explorar','search'],['biblioteca','Tu biblioteca','library'],['crear','Crear','plus']]){$(`[data-page="${key}"]`).innerHTML=icon(ico)+label;}
for(const link of document.querySelectorAll('nav a'))link.addEventListener('click',()=>{pendingCategory=null;query='';category='Audio';if(link.dataset.page==='biblioteca')source='cloud';if(page()===link.dataset.page)render();});
function sources(){const c=el('div',undefined,'chips');for(const [value,label,ico] of [['cloud','Nube','cloud'],['radio','Radios','radio']]){const b=button(label,()=>{source=value;category='Audio';query='';render();},source===value?'active':'');b.prepend(document.createRange().createContextualFragment(icon(ico)));b.setAttribute('aria-pressed',String(source===value));c.append(b);}return c;}
async function render(){
 const version=++generation;controller?.abort();controller=new AbortController();offset=0;items=[];view.replaceChildren();for(const a of document.querySelectorAll('nav a')){a.classList.toggle('active',a.dataset.page===page());a.setAttribute('aria-current',a.dataset.page===page()?'page':'false');}
 if(['acerca','configuracion','estadisticas'].includes(page())){await pages[({acerca:'about',configuracion:'settings',estadisticas:'stats'})[page()]]();return;}
 if(page()==='crear'){createPlaylist();return;}
 view.append(el('h1',({inicio:'Buenas tardes',explorar:'Explorar',biblioteca:'Tu biblioteca'})[page()]||'Inicio'),sources());
 if(source==='cloud'&&!session()){view.replaceChildren();welcome();return;}
 if(page()==='inicio'&&source==='cloud'){await home(version);return;}
 if(page()==='inicio')view.append(el('p',source==='cloud'?'Tu música, siempre contigo.':'Encuentra tu próxima emisora favorita.'));
 if(source==='radio')view.append(button(category==='RadioLikes'?'Ver emisoras':'Me gusta',()=>{category=category==='RadioLikes'?'Audio':'RadioLikes';render();},category==='RadioLikes'?'active':''));
 if(page()!=='inicio'){const [l,input]=field(source==='cloud'?'Buscar música':'Buscar emisoras','search',query);let t;input.oninput=()=>{query=input.value;clearTimeout(t);t=setTimeout(()=>load(false),350);};view.append(l);}
 if(source==='cloud'){const c=el('div',undefined,'chips');for(const [id,label] of [['Audio','Canciones'],['Playlist','Playlists'],['MusicAlbum','Álbumes'],['Favorite','Me gusta']].filter(([id])=>id!=='Favorite'||session()?.mode!=='shared')){const b=button(label,()=>{category=id;render();},category===id?'active':'');b.setAttribute('aria-pressed',String(category===id));c.append(b);}view.append(c);}

 const list=el('div');list.id='results';view.append(list);await load(false,version);
}
async function home(version){
 const greeting=new Date().getHours()<12?'Buenos días':new Date().getHours()<19?'Buenas tardes':'Buenas noches';view.querySelector('h1').textContent=greeting;
 view.append(el('p','Tu música, siempre contigo.'));
 const quick=el('div',undefined,'home-quick');for(const [label,ico,kind] of [['Tus Me gusta','heart','Favorite'],['Tus playlists','library','Playlist']]){if(api.session.mode==='shared'&&kind==='Favorite')continue;const b=button('',()=>{pendingCategory=kind;location.hash='biblioteca';},'quick-card '+kind);b.innerHTML=icon(ico);b.append(el('strong',label),el('span','Explorar →'));quick.append(b);}view.append(quick);
 const client=api,shared=client.session.mode==='shared';
 if(shared)view.append(el('p','Acceso compartido · Explora y escucha. Tus preferencias personales están disponibles con Google.','shared-note'));
 const definitions=[...(!shared?[['Tus Me gusta',()=>client.items({filters:'IsFavorite',limit:8}),'Favorite'],['Escuchado recientemente',()=>client.items({filters:'IsPlayed',sortBy:'DatePlayed',sortOrder:'Descending',limit:8}),'Recent']]:[]),['Sugeridos para ti',()=>client.request('Items/Suggestions',{params:{userId:client.session.userId,mediaType:'Audio',type:'Audio',limit:8}}),'Suggestions'],['Playlists para ti',()=>client.items({includeItemTypes:'Playlist',limit:8}),'Playlist']];
 await Promise.allSettled(definitions.map(async([title,request,kind])=>{
 const section=el('section',undefined,'home-section'),head=el('div',undefined,'section-head'),shelf=el('div',undefined,'shelf');head.append(el('h2',title));section.append(head,shelf);view.append(section);shelf.append(el('p','Cargando…','loading'));
 try{const data=await request();if(version!==generation||client!==api)return;const tracks=data.Items||[];shelf.replaceChildren();if(!tracks.length){shelf.append(el('p','Todavía no hay elementos en esta sección.','empty'));return;}
 for(const track of tracks){const card=button('',async()=>{if(track.Type==='Playlist'){const results=await client.request(`Playlists/${encodeURIComponent(track.Id)}/Items`,{params:{userId:client.session.userId,limit:200}});modal(el('h2',track.Name),...results.Items.map(t=>button(t.Name,async()=>{await play(t,results.Items);$('#dialog').close();})),...(results.Items.length?[]:[el('p','Esta playlist está vacía.')]));}else await play(track,tracks);},'album-card');const cover=el('img');cover.alt='';cover.loading='lazy';cover.referrerPolicy='no-referrer';cover.src=client.artwork(track)||'./assets/icon.svg';cover.onerror=()=>{cover.onerror=null;cover.src='./assets/icon.svg';};card.append(cover,el('strong',track.Name),el('small',track.Artists?.join(', ')||'Nube'));shelf.append(card);}
 head.append(button('Ver todo →',()=>{category=kind;location.hash='biblioteca';pendingCategory=kind;},'text-link'));
 }catch(e){if(version!==generation)return;shelf.replaceChildren(el('p',e.message,'empty'),button('Reintentar',()=>render()));}
 }));
}
let pendingCategory=null;
let loadSerial=0;
async function load(more=false,version=generation){
 const serial=++loadSerial, container=$('#results');if(!container)return;
 controller?.abort();controller=new AbortController();const signal=controller.signal;
 if(!more){offset=0;items=[];container.replaceChildren(el('p','Cargando tu música…','loading'));}container.setAttribute('aria-busy','true');
 try{let result;
 if(source==='radio'&&category==='RadioLikes'){const liked=radioLikes().filter(x=>x.Name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));result={Items:liked,TotalRecordCount:liked.length};}
 else if(source==='radio'){const u=new URL(radioApi+'/json/stations/search');u.search=new URLSearchParams({countrycode:localStorage.getItem('winostalgy.country')||'PE',name:query,hidebroken:'true',order:'clickcount',reverse:'true',limit:'50',offset:String(offset)});const r=await fetch(u,{signal});if(!r.ok)throw new Error(`No se pudo consultar Radio Browser (HTTP ${r.status}).`);const data=await r.json();result={Items:data.map(x=>({Id:x.stationuuid,Name:x.name,Artists:[x.country],radio:true,url:x.url_resolved,art:x.favicon})),TotalRecordCount:offset+data.length+(data.length===50?1:0)};}
 else if(category==='Suggestions')result=await api.request('Items/Suggestions',{params:{userId:session().userId,mediaType:'Audio',type:'Audio',limit:100},signal});
 else result=await api.items({startIndex:offset,searchTerm:query,includeItemTypes:['Favorite','Recent'].includes(category)?'Audio':category,filters:category==='Favorite'?'IsFavorite':category==='Recent'?'IsPlayed':undefined,sortBy:category==='Recent'?'DatePlayed':'SortName',sortOrder:category==='Recent'?'Descending':'Ascending'},signal);
 if(serial!==loadSerial||version!==generation)return;
 items=[...items,...result.Items];total=result.TotalRecordCount??items.length;offset=items.length;draw();
 }catch(e){if(serial===loadSerial&&version===generation&&e.name!=='AbortError'){container.replaceChildren(el('p',e.message,'empty'),button('Reintentar',()=>load(more)));}}finally{container.setAttribute('aria-busy','false');}
}
function draw(){const root=$('#results');if(!root)return;root.replaceChildren();const shown=moveActiveFirst(items,current?.Id);if(!shown.length)root.append(el('p','No se encontraron resultados.','empty'));
 for(const item of shown){const row=el('article',undefined,'row'+(item.Id===current?.Id?' current':''));const art=item.radio?item.art:api.artwork(item);const img=el('img');img.className='cover';img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';if(art&&/^https?:/.test(art))img.src=art;else img.src='./assets/icon.svg';img.onerror=()=>{img.onerror=null;img.src='./assets/icon.svg';};
 const title=button('',()=>openItem(item),'track');title.append(el('strong',item.Name),el('small',item.Artists?.join(', ') || (item.Type==='Playlist'?'Playlist':'Nube')));row.append(img,title);
 if(item.Type!=='Playlist'&&item.Type!=='MusicAlbum'){row.append(action('play','Reproducir '+item.Name,()=>play(item,items)),action('heart','Me gusta: '+item.Name,()=>{}));const heart=row.lastChild;const liked=item.radio?radioLikes().some(x=>x.Id===item.Id):!!item.UserData?.IsFavorite;heart.hidden=!item.radio&&session()?.mode==='shared';heart.classList.toggle('active',liked);heart.setAttribute('aria-pressed',String(liked));heart.onclick=()=>run(heart,async()=>{if(item.radio){const likes=radioLikes().filter(x=>x.Id!==item.Id);if(!liked)likes.push(item);localStorage.setItem('winostalgy.radioLikes',JSON.stringify(likes));}else{const confirmed=await api.favorite(item.Id,!liked);item.UserData=confirmed.UserData;}draw();notice(liked?'Se retiró Me gusta.':'Me gusta guardado.');});if(!item.radio)row.append(action('more','Opciones de '+item.Name,()=>trackMenu(item)));}
 root.append(row);}
 if(items.length<total)root.append(button('Cargar más',()=>load(true)));
}
function radioLikes(){try{return JSON.parse(localStorage.getItem('winostalgy.radioLikes')||'[]');}catch{return [];}}
async function openItem(item){if(['Playlist','MusicAlbum'].includes(item.Type)){controller?.abort();++loadSerial;const data=item.Type==='Playlist'?await api.request(`Playlists/${encodeURIComponent(item.Id)}/Items`,{params:{userId:session().userId,limit:200}}):await api.items({parentId:item.Id,limit:200});items=data.Items;total=offset=items.length;draw();notice(item.Name+' · '+items.length+' canciones cargadas');}else await play(item,items);}
function trackMenu(item){modal(el('h2',item.Name),button('Mezcla similares',()=>mix(item)),...(session()?.mode==='shared'?[]:[button('Añadir a playlist',async()=>{const data=await api.items({includeItemTypes:'Playlist',limit:100});modal(el('h2','Añadir a playlist'),...data.Items.map(p=>button(p.Name,async()=>{await api.request(`Playlists/${encodeURIComponent(p.Id)}/Items`,{method:'POST',params:{userId:session().userId,ids:item.Id}});$('#dialog').close();notice('Canción añadida.');})),...(data.Items.length?[]:[el('p','Crea primero una playlist desde Crear.')]));})]));}
function createPlaylist(){view.append(el('h1','Crear playlist'));if(session()?.mode==='shared'){view.append(el('p','Usa Personalizado para crear tus propias playlists.'),button('Personalizado',cloudChoice));return;}if(!session()){view.append(el('p','Conecta a Nube para guardar tu playlist en Jellyfin.'),button('Conectar',connect));return;}const f=el('form'),[l,input]=field('Nombre de la playlist');input.required=true;input.maxLength=150;const b=el('button','Crear en Nube','primary');b.type='submit';f.append(l,b);f.onsubmit=e=>{e.preventDefault();run(b,async()=>{if(!input.value.trim())return;await api.request('Playlists',{method:'POST',body:{Name:input.value.trim(),UserId:session().userId,MediaType:'Audio',IsPublic:false}});notice('Playlist creada en Jellyfin.');location.hash='biblioteca';});};view.append(f);}
async function play(item,list){const url=item.radio?item.url:api.stream(item.Id);if(!/^https:\/\//.test(url)&&!url.startsWith('http://localhost'))throw new Error('Esta emisora no ofrece un enlace HTTPS compatible.');reporter.stop(audio.currentTime);reported=false;lastReport=0;queue=list.filter(x=>!['Playlist','MusicAlbum'].includes(x.Type));position=queue.findIndex(x=>x.Id===item.Id);current=item;audio.src=url;$('#player').hidden=false;$('#playing').textContent=item.Name+' · '+(item.Artists||[]).join(', ');$('#mix').hidden=!!item.radio;$('#seek').disabled=!!item.radio;
 if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:item.Name,artist:item.Artists?.join(', ')||'',album:item.Album||''});}
 draw();try{await audio.play();}catch{notice('Pulsa Reproducir para iniciar el audio.');}}
async function mix(item=current){if(!item||item.radio||mixing)return;mixing=true;$('#mix').disabled=true;notice('Preparando Mezcla similares…');try{const result=await api.mix(item.Id);if(!result.Items?.length)throw new Error('Jellyfin no devolvió canciones para la mezcla.');await play(result.Items[0],result.Items);$('#dialog').close();notice('Mezcla lista · '+result.Items.length+' canciones. Aleatorio '+(shuffle?'activado.':'desactivado.'));}finally{mixing=false;$('#mix').disabled=false;}}
async function step(delta,ended=false){const n=nextIndex(position,queue.length,{delta,repeat,shuffle,ended});if(n>=0)await play(queue[n],queue);else if(ended){reporter.stop(audio.currentTime);reported=false;}}
function playerDetails(){
 if(!current)return;const card=el('section',undefined,'full-player');const cover=el('img');cover.className='player-cover';cover.alt='';cover.referrerPolicy='no-referrer';cover.src=(current.radio?current.art:api?.artwork(current))||'./assets/icon.svg';cover.onerror=()=>{cover.onerror=null;cover.src='./assets/icon.svg';};card.append(cover,el('h2',current.Name),el('p',current.Artists?.join(', ')||''));
 const controls=el('div',undefined,'controls');controls.append(action('previous','Anterior',async()=>{await step(-1);playerDetails();}),action(audio.paused?'play':'pause',audio.paused?'Reproducir':'Pausar',async()=>{if(audio.paused)await audio.play();else audio.pause();playerDetails();}),action('next','Siguiente',async()=>{await step(1);playerDetails();}));card.append(controls);
 if(!current.radio){const options=el('div',undefined,'chips');options.append(button('Aleatorio: '+(shuffle?'sí':'no'),()=>{shuffle=!shuffle;playerDetails();},shuffle?'active':''),button('Repetir: '+({off:'no',all:'cola',one:'canción'})[repeat],()=>{repeat=({off:'all',all:'one',one:'off'})[repeat];playerDetails();},repeat!=='off'?'active':''),button('Mezcla similares',()=>mix()));card.append(options);if(session()?.mode!=='shared')card.append(button(current.UserData?.IsFavorite?'Retirar Me gusta':'Me gusta',async()=>{const selected=current;const confirmed=await api.favorite(selected.Id,!selected.UserData?.IsFavorite);selected.UserData=confirmed.UserData;draw();playerDetails();}));}
 const list=el('div',undefined,'queue-list');list.append(el('h3','Cola · '+queue.length));queue.forEach((track,index)=>{const b=button((index+1)+'. '+track.Name,async()=>{await play(track,queue);playerDetails();},index===position?'active':'');if(index!==position)b.append(el('span',' ▶'));list.append(b);});card.append(list);modal(card);
}
$('#playing').onclick=playerDetails;
audio.addEventListener('playing',()=>{if(!reported&&current){reported=true;reporter.start(api,current);}});
audio.addEventListener('pause',()=>{if(reported)reporter.progress(audio.currentTime,true);});
audio.addEventListener('seeked',()=>{if(reported)reporter.progress(audio.currentTime,audio.paused);});
audio.addEventListener('timeupdate',()=>{if(reported&&!audio.paused&&Date.now()-lastReport>15000){lastReport=Date.now();reporter.progress(audio.currentTime,false);}});

for(const [id,ico,fn] of [['previous','previous',()=>step(-1)],['next','next',()=>step(1)],['toggle','play',()=>audio.paused?audio.play():audio.pause()],['mix','mix',()=>mix()]]){const b=$('#'+id);b.innerHTML=icon(ico);b.onclick=()=>run(b,fn);}
for(const event of ['play','pause'])audio.addEventListener(event,()=>{$('#toggle').innerHTML=icon(audio.paused?'play':'pause');$('#toggle').setAttribute('aria-label',audio.paused?'Reproducir':'Pausar');if('mediaSession'in navigator)navigator.mediaSession.playbackState=audio.paused?'paused':'playing';});
audio.addEventListener('ended',()=>step(1,true).catch(e=>notice(e.message)));audio.addEventListener('error',()=>notice('No se pudo reproducir este audio. Comprueba el formato, la conexión y los permisos.'));
audio.addEventListener('timeupdate',()=>{$('#seek').value=Number.isFinite(audio.duration)?audio.currentTime/audio.duration*100:0;$('#time').textContent=Math.floor(audio.currentTime/60)+':'+String(Math.floor(audio.currentTime%60)).padStart(2,'0');});$('#seek').onchange=e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)*audio.duration/100;};
if('mediaSession'in navigator)for(const [name,fn] of [['play',()=>audio.play().catch(()=>notice('Pulsa reproducir en Winostalgy.'))],['pause',()=>audio.pause()],['nexttrack',()=>step(1).catch(e=>notice(e.message))],['previoustrack',()=>step(-1).catch(e=>notice(e.message))]])try{navigator.mediaSession.setActionHandler(name,fn);}catch{}
window.addEventListener('hashchange',()=>{query='';category=pendingCategory||'Audio';pendingCategory=null;render();});
if(window.visualViewport)visualViewport.addEventListener('resize',()=>document.body.classList.toggle('keyboard',visualViewport.height<innerHeight*.75&&['INPUT','TEXTAREA'].includes(document.activeElement.tagName)));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>notice('No se pudo preparar la instalación offline.'));
render();
