// Run against the local static server. PLAYWRIGHT_MODULE can point to an existing installation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true, ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE:',e.message)});page.on('console',m=>{if(m.type()==='error')console.error(m.text())});
 let favorite=false,created=false;
 await page.route('https://example.test/**',async route=>{const u=new URL(route.request().url());let data={};
 if(u.pathname==='/Users/AuthenticateByName')data={AccessToken:'test-only',User:{Id:'u',Name:'Prueba'}};
 else if(u.pathname==='/Items')data={Items:[{Id:'song',Name:'Canción de prueba',Artists:['Artista de prueba'],UserData:{IsFavorite:favorite}}],TotalRecordCount:1};
 else if(u.pathname==='/UserFavoriteItems/song')favorite=route.request().method()==='POST';
 else if(u.pathname==='/Items/song')data={UserData:{IsFavorite:favorite}};
 else if(u.pathname==='/Playlists')created=true;
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
 await page.goto('http://127.0.0.1:4173');
 await page.getByRole('button',{name:'Configurar mi servidor Jellyfin'}).click();
 await page.getByLabel('Servidor Jellyfin').fill('https://example.test');await page.getByLabel('Usuario',{exact:true}).fill('test');await page.getByLabel('Contraseña',{exact:true}).fill('not-a-real-password');await page.getByRole('button',{name:'Conectar a Nube',exact:true}).click();
 await page.getByRole('link',{name:'Tu biblioteca',exact:true}).click(); await page.getByRole('button',{name:'Me gusta: Canción de prueba'}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="Me gusta: Canción de prueba"]')?.getAttribute('aria-pressed')==='true');assert.equal(favorite,true);
 await page.getByRole('link',{name:'Crear',exact:true}).click();await page.getByLabel('Nombre de la playlist').fill('Prueba');await page.getByRole('button',{name:'Crear en Nube'}).click();await page.waitForURL('**/#biblioteca');assert.equal(created,true);
 for(const size of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/winostalgy-pwa-library.png',fullPage:true});
 await page.getByRole('button',{name:'Perfil y configuración'}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.getByRole('button',{name:'Configurar mi servidor Jellyfin'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('winostalgy.session')),null);assert.deepEqual(errors,[]);
 console.log('OK: login, favorite confirmation, playlist, logout, no JS errors; no horizontal overflow at 390, 844, 1280px. Mock API, not live Jellyfin.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
