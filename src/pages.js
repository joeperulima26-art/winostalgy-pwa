import {strings as s} from './strings.js';
import {VERSION} from './version.js';
export function createPages({el,button,icon,view,api,session,navigate,connect,notice}) {
 const heading=title=>{const h=el('div',undefined,'page-heading');const back=button('',()=>navigate('inicio'),'back-button');back.innerHTML=icon('back');back.setAttribute('aria-label','Volver a Inicio');h.append(back,el('h1',title));view.append(h);};
 const link=(label,url)=>{const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
 function about(){
 heading(s.aboutTitle);const area=el('section',undefined,'about-screen');const title=el('div',undefined,'about-brand');title.append(el('h2','WINOSTALGY'),el('p',s.tagline));
 const split=el('div',undefined,'about-split'),description=el('section',undefined,'about-description');description.append(el('h3',s.developer),el('p',s.aboutDescription));const features=el('ul');for(const text of s.aboutFeatures)features.append(el('li',text));description.append(features);
 const qr=el('div',undefined,'about-qr');qr.setAttribute('role','img');qr.setAttribute('aria-label','Recuadro reservado para un futuro QR');split.append(description,qr);
 const support=el('section',undefined,'support-panel'),coffee=el('div',undefined,'coffee-icon');coffee.innerHTML=icon('coffee');coffee.setAttribute('aria-hidden','true');const copy=el('div');copy.append(el('h3',s.supportTitle),el('p',s.supportSubtitle));const donate=link(s.supportAction,s.supportURL);donate.className='primary support-action';support.append(coffee,copy,donate);
 const licenses=el('details');licenses.append(el('summary','Licencias y atribuciones'),el('p','Winostalgy · QaraSmart. Cliente de Jellyfin y Radio Browser. Google Identity Services se carga desde Google al iniciar sesión. Recursos visuales reutilizados del proyecto Winostalgy.'),link('Jellyfin','https://jellyfin.org'),el('span',' · '),link('Radio Browser','https://www.radio-browser.info'));
 area.append(title,split,el('p','Versión '+VERSION,'about-version'),support,button('Cerrar',()=>navigate('inicio'),'about-close'),licenses);view.append(area);
 }
 function settings(){
 heading('Configuración');const panel=el('section',undefined,'settings-panel');panel.append(el('h2','Fuentes de música'),el('p',session()?`Jellyfin: ${session().server}`:'Jellyfin no conectado.'),button('Configurar Jellyfin',connect));
 const f=el('form'),label=el('label','País inicial de radios'),select=el('select');select.setAttribute('aria-label','País inicial de radios');const codes=['PE','CO','AR','BO','CL','EC','ES','MX','US','VE','BR','UY'];const names=new Intl.DisplayNames(['es'],{type:'region'});const current=localStorage.getItem('winostalgy.country')||'PE';if(!codes.includes(current))codes.push(current);for(const code of codes){const o=el('option',names.of(code));o.value=code;select.append(o);}select.value=current;label.append(select);const input=el('input');input.maxLength=2;input.pattern='[A-Za-z]{2}';input.placeholder='Ej.: FR';const other=el('label','Otro país (código de dos letras, opcional)');other.append(input);const save=el('button','Guardar preferencias','primary');save.type='submit';f.append(label,other,save);f.onsubmit=e=>{e.preventDefault();const value=(input.value||select.value).toUpperCase();try{if(names.of(value)===value)throw Error();localStorage.setItem('winostalgy.country',value);notice('País de radios actualizado.');}catch{notice('Introduce un código de país válido.');}};panel.append(el('h2','Radios'),f);
 panel.append(el('h2','Instalar en iPhone'),el('p','Abre Winostalgy con HTTPS en Safari. Pulsa Compartir → Añadir a la pantalla de inicio. El audio en segundo plano debe validarse en tu dispositivo.'),el('h2','Almacenamiento'),el('p','La caché actual conserva únicamente la interfaz. No guarda canciones para escuchar sin conexión.'));view.append(panel);
 }
 async function stats(){
 heading('Estadísticas');if(!session()||session().mode==='shared'){view.append(el('p','Conecta tu cuenta personal para consultar sus datos de reproducción.','empty'));return;}
 const client=api(),root=el('section');view.append(root);root.append(el('p','Consultando Jellyfin…','loading'));
 try{const data=await client.items({sortBy:'PlayCount',sortOrder:'Descending',filters:'IsPlayed',limit:20});if(!root.isConnected||client!==api())return;root.replaceChildren(el('p','Canciones más reproducidas según los contadores acumulados de tu cuenta Jellyfin. No representan minutos semanales.'));
 if(!data.Items?.length){root.append(el('p','Todavía no hay reproducciones registradas en Jellyfin.','empty'));return;}
 for(const item of data.Items){const card=el('article',undefined,'stat-card');card.append(el('strong',item.Name),el('p',item.Artists?.join(', ')||'Artista no informado'),el('span',`${item.UserData?.PlayCount||0} reproducciones`));root.append(card);}
 }catch(e){if(root.isConnected)root.replaceChildren(el('p',e.message,'empty'),button('Reintentar',()=>{view.replaceChildren();stats();}));}
 }
 return {about,settings,stats};
}
