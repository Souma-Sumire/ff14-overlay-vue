import{d as D,v as a,am as f,o,b as i,u as t,t as m,g as c}from"./vendor-834361d8.js";import{_ as L}from"./index-c2706900.js";const A={key:0,class:"time gameTime"},k={key:1,class:"time logTime"},w={key:2,class:"time realTime"},C=D({__name:"time",setup(S){const r=a(""),l=a(!1),s=a(0),n=a(""),d=a(""),u=new URLSearchParams(window.location.search).get("timeType")==="game"?"game":"real";requestAnimationFrame(function e(){if(r.value=f().format("YYYY/MM/DD HH:mm:ss.SSS"),s.value>0){const h=Date.now()-s.value,v=f.duration(h),_=v.minutes(),p=v.seconds();n.value=`${_<10?"0":""}${_}:${p<10?"0":""}${p}`}requestAnimationFrame(e)});const g=e=>{e.isActive==="true"&&l.value===!1?s.value=Date.now():e.isActive==="false"&&(s.value=0,n.value=""),l.value=e.isActive==="true"},y=e=>{e.line[0]!=="00"&&(d.value=e.line[1].match(new RegExp("(?<=T)\\d\\d:\\d\\d\\:\\d\\d\\.\\d\\d\\d"))[0])};return addOverlayListener("CombatData",g),addOverlayListener("LogLine",y),startOverlayEvents(),(e,T)=>(o(),i("div",null,[t(n)?(o(),i("span",A,m(t(n)),1)):c("",!0),t(u)==="game"?(o(),i("span",k,m(t(d)),1)):c("",!0),t(u)==="real"?(o(),i("span",w,m(t(r)),1)):c("",!0)]))}});const O=L(C,[["__scopeId","data-v-47278269"]]);export{O as default};