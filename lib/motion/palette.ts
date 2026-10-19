// Interpolate display colours along an authored warm path. Linear-light wine
// to ivory creates the grey/mauve middle seen in the previous daylight return.
function palette(stops:readonly (readonly [number,string])[],t:number):string {
 const x=Math.max(0,Math.min(1,t));let i=0;
 while(i<stops.length-2&&x>stops[i+1][0])i++;
 const [start,a]=stops[i],[end,b]=stops[i+1],u=(x-start)/(end-start);
 const channels=[1,3,5].map(n=>Math.round(parseInt(a.slice(n,n+2),16)*(1-u)+parseInt(b.slice(n,n+2),16)*u).toString(16).padStart(2,'0'));
 return '#'+channels.join('');
}
export const studioColor=(darkness:number)=>palette([[0,'#f8eee2'],[.4,'#e8bda3'],[.7,'#a45046'],[1,'#260b14']],darkness);
export const textColor=(darkness:number)=>palette([[0,'#2b0711'],[.55,'#2b0711'],[.8,'#fff3e7'],[1,'#f7eee3']],darkness);
