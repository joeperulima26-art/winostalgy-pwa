import {serverURL} from './api.js';
export const CONFIG_URL='https://docs.google.com/document/d/1RiHYwajI7Rzq8ZZ2JiOKefsb6VgnIBYf8_Vzu5vF9Rs/export?format=txt';
export function decodeDemo(value){
 if(!value?.startsWith('xor-v1:'))throw new Error('Formato de acceso compartido no válido.');
 const bytes=Uint8Array.from(atob(value.slice(7)),c=>c.charCodeAt(0)),key=new TextEncoder().encode('Winostalgy-demo-v1');
 if(!bytes.length||bytes.length>4096)throw new Error('Acceso compartido no válido.');
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes.map((x,i)=>x^key[i%key.length]));
}
export function parseConfig(text){
 if(new TextEncoder().encode(text).length>65536)throw new Error('Configuración remota demasiado grande.');
 const raw=Object.fromEntries(text.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x.includes('=')&&!x.startsWith('#')).map(x=>[x.slice(0,x.indexOf('=')).trim(),x.slice(x.indexOf('=')+1).trim()]));
 const clean=x=>x?.replace(/\\+$/,'').replaceAll('\\:',':').trim();
 if(!raw.jellyfindefault)throw new Error('La configuración no contiene el servidor Nube.');
 return {server:serverURL(clean(raw.jellyfindefault)),radioApi:raw.radioapi?serverURL(clean(raw.radioapi)):'https://de1.api.radio-browser.info',country:/^[A-Z]{2}$/.test(clean(raw.radiocountry)?.toUpperCase())?clean(raw.radiocountry).toUpperCase():'PE',demoEnabled:clean(raw.winostalgy_demo_enabled)==='true',user:raw.jellyfinuser,password:raw.jellyfinpassword_obfuscated?decodeDemo(raw.jellyfinpassword_obfuscated):raw.jellyfinpassword};
}
export async function loadConfig(transport=fetch){
 let response;try{response=await transport(CONFIG_URL,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});}catch{throw new Error('No se pudo leer la configuración de Nube. Comprueba la conexión o usa tu propio servidor.');}
 if(!response.ok)throw new Error('La configuración de Nube no está disponible.');
 return parseConfig(await response.text());
}
