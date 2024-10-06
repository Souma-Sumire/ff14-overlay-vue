import{d as Z,az as ee,n as x,q as P,b as te,r as T,o as p,e as y,s as J,v as N,u as n,t as s,a as k,w,a1 as ae,F as M,L as E,aP as ne,Q as I,a0 as oe,G as re,H as se,c as le,y as B}from"./vendor-9c3ca848.js";import{_ as ue}from"./DragJob-165d84d8.js";import{a as D,c as ie}from"./overlay_plugin_api-409cb9ea.js";import{j as ce,U as d}from"./util-831b56e7.js";import{_ as pe}from"./_plugin-vue_export-helper-c27b6911.js";const L=_=>(re("data-v-02bfa34a"),_=_(),se(),_),de={class:"text-white text-shadow-sm text-shadow-color-black"},fe=L(()=>s("span",null,"用法",-1)),me=L(()=>s("p",null,"使悬浮窗的位置分配对应游戏内的实际位置（D1D2等）",-1)),ye=L(()=>s("ul",null,[s("li",null,"临时：下拉选择框修改。"),s("li",null,"长期：用鼠标拖动职能顺序。")],-1)),_e={class:"players"},ve={class:"name"},be={key:0,style:{position:"fixed",bottom:"0"}},he=Z({__name:"cactbotRuntime",setup(_){ee.setTheme("dark");function i(e,t,o=0){return Array(t).fill(e).map((f,O)=>f+(+O+1+o))}const c=x(!1),j=P("cactbotRuntime-sortArr",ce),A=[{id:"10000001",name:"虚构战士",job:21,inParty:!0},{id:"10000002",name:"虚构骑士",job:19,inParty:!0},{id:"10000003",name:"虚构占星",job:33,inParty:!0},{id:"10000004",name:"虚构学者",job:28,inParty:!0},{id:"10000005",name:"虚构忍者",job:30,inParty:!0},{id:"10000006",name:"虚构武士",job:34,inParty:!0},{id:"10000008",name:"虚构诗人",job:23,inParty:!0},{id:"10000007",name:"虚构召唤",job:27,inParty:!0}],a=P("cactbotRuntime-data",{party:[]}),S=P("cactbotRuntime-showTips",x(!0)),v=P("cactbotRuntime-roleSelectLength",{tank:0,healer:0,dps:0,crafter:0,gatherer:0,none:0}),l={tank:["MT","ST",...i("T",6,2)],healer:[...i("H",8)],dps:[...i("D",8)],crafter:[...i("C",8)],gatherer:[...i("G",8)],none:[...i("N",8)]};function z(){for(const e in v.value)Object.prototype.hasOwnProperty.call(v.value,e)&&(v.value[e]=a.value.party.reduce((t,o)=>R(o.job)===e?t+1:t,0))}function G(e){const t=R(e);return l[t].filter((o,f)=>f<v.value[t])}const b=location.href.includes("localhost"),u=x(!1),C=x(b?A[2].name:"");function R(e){return[1,3,19,21,32,37].includes(e)?"tank":[6,24,28,33,40].includes(e)?"healer":[2,4,5,7,20,22,23,25,26,27,29,30,31,34,35,36,38,39,41,42].includes(e)?"dps":d.isCraftingJob(d.jobEnumToJob(e))?"crafter":d.isGatheringJob(d.jobEnumToJob(e))?"gatherer":"none"}function $(){a.value.party.sort((e,t)=>j.value.indexOf(e.job)-j.value.indexOf(t.job));for(const e of a.value.party)e.rp=void 0;for(const e of a.value.party)e.rp=U(e)}function F(e){const t=a.value.party.find(o=>o.rp===a.value.party[e].rp&&o.id!==a.value.party[e].id);t&&(t.rp=U(t)),h()}function U(e){return l[R(e.job)].find(t=>!a.value.party.find(o=>o.rp===t))??"unknown"}function h(){const e=[...l.tank,...l.healer,...l.dps,...l.crafter,...l.gatherer,...l.none];a.value.party.sort((t,o)=>e.indexOf(t.rp??"unknown")-e.indexOf(o.rp??"unknown")),ie({call:"broadcast",source:"soumaRuntimeJS",msg:{party:a.value.party}})}function H(){u.value=!0}function q(){u.value=!1}function Q(e){j.value=e,g()}function K(e){return d.nameToFullName(d.jobEnumToJob(e)).simple1}function ge(e){return e}function g(){$(),z(),h()}te(()=>{h(),D("PartyChanged",e=>{S.value&&(c.value=!0),!(b&&e.party.length===0)&&(a.value.party=e.party.filter(t=>t.inParty).map(t=>({...t,rp:"unknown"})),g())}),D("ChangePrimaryPlayer",e=>{b||(C.value=e.charName)}),D("BroadcastMessage",e=>{e.source==="soumaUserJS"&&typeof e.msg=="object"&&e.msg!==null&&Reflect.get(e.msg,"text")==="requestData"&&h()})});function W(){const e={party:A};S.value&&(c.value=!0),a.value.party=e.party.filter(t=>t.inParty).map(t=>({...t,rp:"unknown"})),g()}return(e,t)=>{const o=T("vxe-modal"),f=T("vxe-option"),O=T("vxe-select"),X=ue;return p(),y("div",{onMouseenter:H,onMouseleave:q},[J(s("span",de,"...",512),[[N,n(a).party.length<=1]]),k(o,{modelValue:n(c),"onUpdate:modelValue":t[0]||(t[0]=r=>ae(c)?c.value=r:null),size:"small",position:{left:10,top:10},width:"90vw",onClose:t[1]||(t[1]=r=>{c.value=!1,S.value=!1})},{title:w(()=>[fe]),default:w(()=>[me,ye]),_:1},8,["modelValue"]),s("main",{style:I({width:n(u)?`${18+ +(n(a).party.find(r=>r.job===36)?1:0)}em`:"4em"})},[s("div",_e,[k(ne,{name:"animate__animated animate__bounce","enter-active-class":"animate__fadeInLeft","leave-active-class":"animate__fadeOutLeft"},{default:w(()=>[(p(!0),y(M,null,E(n(a).party,(r,V)=>J((p(),y("section",{key:r.id,flex:"~ nowrap",style:I({opacity:n(u)?1:.5}),class:"player"},[k(O,{modelValue:r.rp,"onUpdate:modelValue":m=>r.rp=m,size:"mini","class-name":"select",onChange:m=>F(V)},{default:w(()=>[(p(!0),y(M,null,E(G(r.job),(m,Y)=>(p(),le(f,{key:Y,value:m,label:m},null,8,["value","label"]))),128))]),_:2},1032,["modelValue","onUpdate:modelValue","onChange"]),s("span",ve,B(K(r.job))+" "+B(n(u)?r.name:""),1)],4)),[[N,n(a).party.length>1&&(n(u)||r.name===n(C))]])),128))]),_:1})]),J(k(X,{party:n(a).party,"m-b-1":"","p-1":"",onUpdateSortArr:Q},null,8,["party"]),[[N,n(u)]])],4),n(b)?(p(),y("div",be,[s("button",{onClick:t[2]||(t[2]=r=>{n(a).party=n(a).party.filter(V=>V.name===n(C)),g()})}," 测试单人 "),s("button",{onClick:W}," 测试组队 ")])):oe("",!0)],32)}}});const Se=pe(he,[["__scopeId","data-v-02bfa34a"]]);export{Se as default};