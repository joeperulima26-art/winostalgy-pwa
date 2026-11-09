import {mkdir,cp,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const {version}=JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8'));
await writeFile(new URL('./src/version.js',import.meta.url),`// Generated from package.json by build.mjs.\nexport const VERSION = '${version}';\n`);
await rm(new URL('./dist/',import.meta.url),{recursive:true,force:true});
await mkdir(new URL('./dist/',import.meta.url));
for(const path of ['index.html','style.css','manifest.webmanifest','sw.js','src','assets'])await cp(new URL(path,import.meta.url),new URL('dist/'+path,import.meta.url),{recursive:true});
if(process.argv.includes('--minify')){
  // Distribution only; no source maps or development files are published.
  for(const path of ['sw.js',...(await readdir(new URL('./dist/src/',import.meta.url))).filter(p=>p.endsWith('.js')).map(p=>'src/'+p)]){
    const file=fileURLToPath(new URL('dist/'+path,import.meta.url));
    execFileSync('terser',[file,'--compress','--mangle','--module','--comments','false','--output',file],{stdio:'inherit'});
  }
}
console.log('PWA lista en pwa/dist (archivos estáticos).');
