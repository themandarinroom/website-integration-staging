import {TOPICS} from './catalog.mjs';

export function parseRoute(hash='') {
  const raw=hash.replace(/^#/,'')||'/';
  const split=raw.indexOf('?');
  const path=split<0?raw:raw.slice(0,split);
  const params=new URLSearchParams(split<0?'':raw.slice(split+1));
  const name=path.split('/')[1]||'home';
  const legacy=name==='year-levels';
  const query=params.toString();
  return {page:legacy?'home':name,params,redirect:legacy?`#/${query?'?'+query:''}`:null};
}
export function readFilters(params) {
  const year=params.get('year');
  const topic=params.get('topic');
  return {year:/^[0-6]$/.test(year||'')?Number(year):null,
    topic:TOPICS.some(t=>t.id===topic)?topic:null,query:params.get('q')||''};
}
export function resourceRoute(page,{year=null,topic=null,query=''}={}) {
  const params=new URLSearchParams();
  if(Number.isInteger(year)&&year>=0&&year<=6)params.set('year',String(year));
  if(TOPICS.some(t=>t.id===topic))params.set('topic',topic);
  if(query.trim())params.set('q',query.trim());
  const encoded=params.toString();
  return `#/${page==='home'?'':page}${encoded?'?'+encoded:''}`;
}
