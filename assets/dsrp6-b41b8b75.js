import{c as H}from"./xivapi-cae66b04.js";import{a as P}from"./overlay_plugin_api-409cb9ea.js";import{d as b,B as N,o as s,b as n,g as l,u as f,J as g,K as m,i as I,p as w,l as k,t as p,I as v}from"./vendor-11731512.js";import{_ as L}from"./index-83851854.js";import"./queryParams-cf2e4fb1.js";import"./util-ef9ccf87.js";const T=_=>(w("data-v-afb3c052"),_=_(),k(),_),B={id:"container"},D={key:0},F=T(()=>l("li",{class:"li-head"},[l("aside",null,"秒"),l("h5",null,"邪龙"),l("h5",null,"圣龙")],-1)),S={class:"xie"},C=["src"],V={class:"sheng"},$=["src"],A=b({__name:"dsrp6",setup(_){P("LogLine",y);const c={xie:["尼德霍格","ニーズヘッグ","Nidhogg"],sheng:["赫拉斯瓦尔格","フレースヴェルグ","Hraesvelgr"]},i=N({data:[],show:!1}),r={xie:0,sheng:0};let h=0;async function y(e){var d,t,u,o;if(e.line[0]==="20"&&/^6D41$/.test(e.line[4]))i.data.length=0,i.show=!0,i.data.push({xie:[],sheng:[],xieHP:"0",shengHP:"0"}),h=new Date().getTime(),setTimeout(()=>{h=0},7700);else if(e.line[0]==="20"&&/^(?:63C8|6D21)$/.test(e.line[4]))i.data.length=0,i.show=!1,i.data.push({xie:[],sheng:[],xieHP:"0",shengHP:"0"});else if(h>0&&(e.line[0]==="21"||e.line[0]==="22")&&((t=(d=e.line)==null?void 0:d[2])==null?void 0:t[0])==="1"&&((o=(u=e.line)==null?void 0:u[6])==null?void 0:o[0])==="4"){if(e.line[4]==="07"||e.line[4]==="08")return;const a=Math.round((new Date().getTime()-h)/1e3);i.data[a]===void 0&&(i.data[a]={xie:[],sheng:[],xieHP:r.xie.toFixed(1),shengHP:r.sheng.toFixed(1)});const x=await H(Number.parseInt(e.line[4],16));c.xie.includes(e.line[7])?(r.xie=Number(e.line[24])/Number(e.line[25])*100,i.data[a].xie.push(x),i.data[a].xieHP=r.xie.toFixed(1)):c.sheng.includes(e.line[7])&&(r.sheng=Number(e.line[24])/Number(e.line[25])*100,i.data[a].sheng.push(x),i.data[a].shengHP=r.sheng.toFixed(1))}}return(e,d)=>(s(),n("div",B,[l("main",null,[f(i).show?(s(),n("ul",D,[F,(s(!0),n(g,null,m(f(i).data,(t,u)=>(s(),n("li",{class:"li-main",key:u},[l("aside",null,p(u),1),l("div",S,[v(p((t==null?void 0:t.xieHP)??"")+"%",1),(s(!0),n(g,null,m(t==null?void 0:t.xie,(o,a)=>(s(),n("img",{key:a,src:o,alt:""},null,8,C))),128))]),l("div",V,[v(p((t==null?void 0:t.shengHP)??"")+"%",1),(s(!0),n(g,null,m(t==null?void 0:t.sheng,(o,a)=>(s(),n("img",{key:a,src:o,alt:""},null,8,$))),128))])]))),128))])):I("",!0)])]))}});const q=L(A,[["__scopeId","data-v-afb3c052"]]);export{q as default};