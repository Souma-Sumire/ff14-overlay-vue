import{d as w,I as y,m as D,b as x,ah as _,o as n,e as r,a as c,w as i,s as e,x as l,u as s,$ as N,F as v,K as G,a4 as S,a5 as k,D as I,G as F,q as L,v as U,aM as E}from"./vendor-4de35385.js";import{_ as $}from"./_plugin-vue_export-helper-c27b6911.js";const z=a=>(I("data-v-dd54f427"),a=a(),F(),a),M={class:"common-layout"},P=z(()=>e("h1",null,"FFLOGS上传器 加速下载",-1)),q={key:0},B={flex:"~ col wrap gap1","items-start":""},R=w({__name:"fflogsUploaderDownload",setup(a){const o=y({res:{}}),h=D(),m=[["https://gh.h233.eu.org/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [@X.I.U/XIU2] 提供"],["https://gh.ddlc.top/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [@mtr-static-official] 提供"],["https://dl.ghpig.top/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [feizhuqwq.com] 提供"],["https://slink.ltd/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [知了小站] 提供"],["https://gh.con.sh/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [佚名] 提供"],["https://cors.isteed.cc/github.com","[美国 Cloudflare CDN] - 该公益加速源由 [@Lufs's] 提供"],["https://hub.gitmirror.com/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供"],["https://sciproxy.com/github.com","[美国 Cloudflare CDN] - 该公益加速源由 [sciproxy.com] 提供"],["https://ghproxy.cc/https://github.com","[美国 洛杉矶] - 该公益加速源由 [@yionchiii lau] 提供"],["https://cf.ghproxy.cc/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii lau] 提供"],["https://gh.jiasu.in/https://github.com","[美国 Cloudflare CDN] - 该公益加速源由 [@0-RTT] 提供"],["https://dgithub.xyz","[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供"],["https://download.nuaa.cf","[美国 洛杉矶] - 该公益加速源由 [FastGit 群组成员] 提供"],["https://download.scholar.rr.nu","[美国 纽约] - 该公益加速源由 [FastGit 群组成员] 提供"],["https://download.yzuu.cf","[美国 纽约] - 该公益加速源由 [FastGit 群组成员] 提供"]];x(()=>{fetch("https://api.github.com/repos/RPGLogs/Uploaders-fflogs/releases/latest",{method:"GET"}).then(t=>{if(t.ok)return t.json();throw t.status}).then(t=>{_.close(),h.value=t.assets.find(p=>/v.+\.exe$/.test(p.name)).name,o.res=t}).catch(t=>{t.status===403?d("您的网络环境不允许访问GitHub API，请检查网络设置。"):d(t)})});function d(t){_.fire({icon:"error",title:"错误",text:t})}return(t,p)=>{const g=E,C=S,b=k;return n(),r("div",M,[c(b,null,{default:i(()=>[c(C,null,{default:i(()=>[P,e("h2",null,"最新版本："+l(s(o).res.tag_name||"loading"),1),e("h2",null,"更新时间："+l(s(o).res.published_at||"loading"),1),s(o).res.tag_name?(n(),r("h3",q," 加速节点：（挨个试试，总有一个能用的） ")):N("",!0),e("div",B,[(n(),r(v,null,G(m,(u,f)=>L(c(g,{key:f,href:`${u[0]}/RPGLogs/Uploaders-fflogs/releases/download/v${s(o).res.name}/${s(h)}`,type:"primary","m-r-8px":""},{default:i(()=>[e("span",null,l((f+1).toString().padStart(2,"0"))+"."+l(u[1])+"节点",1)]),_:2},1032,["href"]),[[U,s(o).res.tag_name]])),64))])]),_:1})]),_:1})])}}});const j=$(R,[["__scopeId","data-v-dd54f427"]]);export{j as default};