import{d as D,B as b,A as w,F as N,ai as _,o as n,b as r,a as c,w as h,g as s,t as l,u as e,i as v,J as x,K as y,k,e as S,p as L,l as E,h as U,H as B,aD as F}from"./vendor-11731512.js";import{_ as G}from"./index-83851854.js";const I=a=>(L("data-v-1961d824"),a=a(),E(),a),$={class:"common-layout"},V=I(()=>s("h1",null,"FFLOGS上传器 加速下载",-1)),j={key:0},M={flex:"~ col wrap gap1","items-start":""},P=D({__name:"fflogsUploaderDownload",setup(a){const o=b({res:{}}),p=w(),f=[["https://gh.h233.eu.org/https://github.com","[美国 Cloudflare CDN]"],["https://gh.ddlc.top/https://github.com","[美国 Cloudflare CDN]"],["https://dl.ghpig.top/https://github.com","[美国 Cloudflare CDN]"],["https://slink.ltd/https://github.com","[美国 Cloudflare CDN]"],["https://git.xfj0.cn/https://github.com","[美国 Cloudflare CDN]"],["https://gh.con.sh/https://github.com","[美国 Cloudflare CDN]"],["https://cors.isteed.cc/github.com","[美国 Cloudflare CDN]"],["https://hub.gitmirror.com/https://github.com","[美国 Cloudflare CDN]"],["https://sciproxy.com/github.com","[美国 Cloudflare CDN]"],["https://ghproxy.cc/https://github.com","[美国 洛杉矶]"],["https://cf.ghproxy.cc/https://github.com","[美国 Cloudflare CDN]"],["https://download.nuaa.cf","[美国 洛杉矶]"],["https://download.scholar.rr.nu","[美国 纽约]"],["https://download.yzuu.cf","[美国 纽约]"]];return N(()=>{fetch("https://api.github.com/repos/RPGLogs/Uploaders-fflogs/releases/latest",{method:"GET"}).then(t=>{if(t.ok)return t.json();throw t.status}).then(t=>{_.close(),p.value=t.assets.find(d=>/v.+\.exe$/.test(d.name)).name,o.res=t}).catch(t=>{_.fire({icon:"error",title:"错误",text:t})})}),(t,d)=>{const m=F,g=k,C=S;return n(),r("div",$,[c(C,null,{default:h(()=>[c(g,null,{default:h(()=>[V,s("h2",null,"最新版本："+l(e(o).res.tag_name||"loading"),1),s("h2",null,"更新时间："+l(e(o).res.published_at||"loading"),1),e(o).res.tag_name?(n(),r("h3",j,"加速节点：（挨个试试，总有一个能用的）")):v("",!0),s("div",M,[(n(),r(x,null,y(f,(i,u)=>U(c(m,{key:u,href:`${i[0]}/RPGLogs/Uploaders-fflogs/releases/download/v${e(o).res.name}/${e(p)}`,type:"primary","m-r-8px":""},{default:h(()=>[s("span",null,l((u+1).toString().padStart(2,"0"))+"."+l(i[1])+"节点",1)]),_:2},1032,["href"]),[[B,e(o).res.tag_name]])),64))])]),_:1})]),_:1})])}}});const A=G(P,[["__scopeId","data-v-1961d824"]]);export{A as default};