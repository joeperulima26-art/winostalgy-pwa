export function nextIndex(index,length,{delta=1,repeat='off',shuffle=false,ended=false,random=Math.random}={}){
 if(!length)return -1;
 if(ended&&repeat==='one')return index;
 if(shuffle&&delta>0&&length>1){const n=Math.floor(random()*(length-1));return n>=index?n+1:n;}
 const next=index+delta;if(next>=0&&next<length)return next;
 return repeat==='all'?(next+length)%length:-1;
}
export class PlaybackReporter {
 constructor(onError=()=>{}){this.active=null;this.chain=Promise.resolve();this.onError=onError;}
 send(client,path,body){this.chain=this.chain.then(()=>client.request(path,{method:'POST',body})).catch(()=>this.onError());return this.chain;}
 start(client,item){if(!client||client.session.mode==='shared'||item.radio)return;this.active={client,id:item.Id};return this.send(client,'Sessions/Playing',{ItemId:item.Id,PositionTicks:0,IsPaused:false,CanSeek:true,PlayMethod:'Transcode'});}
 progress(seconds,paused){if(!this.active)return;return this.send(this.active.client,'Sessions/Playing/Progress',{ItemId:this.active.id,PositionTicks:Math.round(Math.max(0,seconds||0)*1e7),IsPaused:paused,CanSeek:true,PlayMethod:'Transcode'});}
 stop(seconds){const a=this.active;this.active=null;if(a)return this.send(a.client,'Sessions/Playing/Stopped',{ItemId:a.id,PositionTicks:Math.round(Math.max(0,seconds||0)*1e7)});}
}
