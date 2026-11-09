export function serverURL(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname))) throw new Error('Usa una dirección HTTPS para Jellyfin.');
  if(u.username || u.password || u.search || u.hash) throw new Error('La dirección no debe incluir credenciales, parámetros ni fragmentos.');
  return u.href.replace(/\/$/, '');
}
export class Jellyfin {
  constructor(server, device, session = null, transport = fetch) { this.server=serverURL(server); this.device=device; this.session=session; this.fetch=(...args)=>transport(...args); }
  url(path, params={}) { const u=new URL(this.server+'/'+path); for(const [k,v] of Object.entries(params)) if(v!==undefined && v!==null && v!=='') u.searchParams.set(k,String(v)); return u; }
  async request(path, {method='GET',params={},body,signal}={}) {
    if(this.session?.mode==='shared' && method!=='GET' && path!=='Sessions/Logout') throw new Error('El acceso compartido solo permite explorar y reproducir. Usa Personalizado para guardar tus preferencias.');
    const auth=`MediaBrowser Client="Winostalgy PWA", Device="Browser", DeviceId="${this.device}", Version="0.1.0"`;
    let r;
    try { r=await this.fetch(this.url(path,params), {method,headers:{Authorization:auth,...(this.session?{'X-Emby-Token':this.session.token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:signal || AbortSignal.timeout(25000),cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'}); }
    catch(e) { if(e.name==='AbortError') throw e; throw new Error('No se pudo conectar. Comprueba Internet, HTTPS y el acceso web (CORS) del servidor.'); }
    if(!r.ok) throw new Error(r.status===401?'La sesión no es válida. Vuelve a iniciar sesión.':r.status===403?'Tu cuenta no tiene permiso para esta operación.':`Jellyfin no pudo completar la operación (HTTP ${r.status}).`);
    const text=await r.text(); return text ? JSON.parse(text) : null;
  }
  async login(user,password) { return this.accept(await this.request('Users/AuthenticateByName',{method:'POST',body:{Username:user,Pw:password}})); }
  accept(result) {
    const user=result.User || result.user, token=result.AccessToken || result.accessToken;
    if(!user?.Id && !user?.id || !token) throw new Error('El servidor devolvió una sesión incompleta.');
    this.session={server:this.server,token,userId:user.Id || user.id,email:user.Email || user.email || (/^.+@.+$/.test(user.Name||user.name||'')?(user.Name||user.name):''),name:result.DisplayName || result.displayName || user.Name || user.name}; return this.session;
  }
  items(params={},signal) { return this.request('Items',{params:{userId:this.session.userId,recursive:true,includeItemTypes:'Audio',enableUserData:true,fields:'Genres,PrimaryImageAspectRatio',sortBy:'SortName',limit:50,...params},signal}); }
  async favorite(id,desired) {
    await this.request('UserFavoriteItems/'+encodeURIComponent(id),{method:desired?'POST':'DELETE',params:{userId:this.session.userId}});
    const item=await this.request('Items/'+encodeURIComponent(id),{params:{userId:this.session.userId}});
    if(item.UserData?.IsFavorite!==desired) throw new Error('Jellyfin aún no confirmó el cambio de Me gusta. Actualiza para comprobarlo.');
    return item;
  }
  mix(id) { return this.request(`Items/${encodeURIComponent(id)}/InstantMix`,{params:{userId:this.session.userId,limit:50}}); }
  stream(id) { return this.url(`Audio/${encodeURIComponent(id)}/stream.mp3`,{api_key:this.session.token,userId:this.session.userId,deviceId:this.device,audioCodec:'mp3',audioBitRate:192000}).href; }
  artwork(item) { const id=item.ImageTags?.Primary?item.Id:item.AlbumPrimaryImageTag?item.AlbumId:null; return id?this.url(`Items/${encodeURIComponent(id)}/Images/Primary`,{maxWidth:320,quality:85,tag:item.ImageTags?.Primary || item.AlbumPrimaryImageTag,api_key:this.session.token}).href:null; }
}
export function moveActiveFirst(items,id) { const index=items.findIndex(x=>x.Id===id); return index>0?[items[index],...items.slice(0,index),...items.slice(index+1)]:[...items]; }
