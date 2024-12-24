import{d as S,r as l,ay as k,o,e as i,a,w as t,c as T,y as C,A as _,t as B,$ as m,x as s,G as x,ag as N,a4 as A,a5 as R,H as I,I as D}from"./vendor-8aa0aaaa.js";import{_ as L}from"./_plugin-vue_export-helper-c27b6911.js";const M="/ff14-overlay-vue/assets/castingMonitor-6712fc16.webp",W="/ff14-overlay-vue/assets/castingToChinese-3f47f77a.webp",z="/ff14-overlay-vue/assets/dnc-fb351e04.webp",O="/ff14-overlay-vue/assets/keigennRecord2-4142bde2.webp",V="/ff14-overlay-vue/assets/keySkillTimer-794d4a66.webp",H="/ff14-overlay-vue/assets/limitBreakTip-f4c9c6e9.webp",P="/ff14-overlay-vue/assets/raidbuffRecord-3a54552e.webp",U="/ff14-overlay-vue/assets/risingstones-ea75f732.webp",j="/ff14-overlay-vue/assets/teamWatch-b39910c5.webp",E="/ff14-overlay-vue/assets/timeline-6b6992a2.webp",F="/ff14-overlay-vue/assets/zoneMacro-a2a2a9eb.webp",r=n=>(I("data-v-8889d223"),n=n(),D(),n),G={class:"common-layout"},Y=r(()=>s("h1",{class:"main-title"}," 主页导航 ",-1)),q=r(()=>s("div",{class:"card-header"},[s("span",null,"联系我")],-1)),Q=r(()=>s("div",{class:"contact-info"},[s("a",{href:"https://github.com/Souma-Sumire",target:"_blank",class:"contact-link"}," Github "),s("a",{href:"https://space.bilibili.com/1443740",target:"_blank",class:"contact-link"}," Bilibili "),s("span",{class:"qq-group"},"QQ群: 231937107"),s("span",{class:"warning-text"}," 其余账号均为山寨，请勿相信任何信息 "),s("span",{class:"info-text"}," 本人无国服最终幻想14账号（已卖），请勿打扰同名的其他玩家 ")],-1)),X=["href"],$={key:0,class:"preview-image"},J={key:1},K=["innerHTML"],Z=S({__name:"startPages",setup(n){function u(p){return new URL(Object.assign({"../assets/screenshots/castingMonitor.webp":M,"../assets/screenshots/castingToChinese.webp":W,"../assets/screenshots/dnc.webp":z,"../assets/screenshots/keigennRecord2.webp":O,"../assets/screenshots/keySkillTimer.webp":V,"../assets/screenshots/limitBreakTip.webp":H,"../assets/screenshots/raidbuffRecord.webp":P,"../assets/screenshots/risingstones.webp":U,"../assets/screenshots/teamWatch.webp":j,"../assets/screenshots/timeline.webp":E,"../assets/screenshots/zoneMacro.webp":F})[`../assets/screenshots/${p}`],self.location)}const h=[{title:"国际服汉化补丁",type:"网页",path:"https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/",comment:"前往Github项目了解详情"},{title:"Cactbot Raidboss 自定义文件",type:"网页",path:"https://github.com/Souma-Sumire/raidboss-user-js-public",comment:"俗称轮椅，使用我的自定义文件覆盖默认触发器，前往Github项目了解详情"},{title:"FFLOGS 上传器 加速下载",type:"网页",path:"fflogsUploaderDownload"},{title:"[悬浮窗] 治疗/减伤时间轴",type:"悬浮窗",path:"timeline",src:"timeline.webp",comment:'编辑时间轴：在浏览器中打开<a href="/ff14-overlay-vue/#/timelineSettings?OVERLAY_WS=ws://127.0.0.1:10501/ws">这个网页</a>'},{title:"[悬浮窗] 减伤监控2",type:"悬浮窗/网页",path:"keigennRecord2?scale=1&opacity=0.8&showHeader=true&showIcon=true&showName=false&abbrId=true&anonymous=true&replaceWithYou=false&parseAA=true&parseDoT=false&minimize=false&actionCN=true&statusCN=true",comment:`可以添加到 ACT 悬浮窗中用于实时监控。也可以在浏览器中打开，导入日志分析过往记录。

URL地址栏参数说明：
scale: 缩放倍率，默认1
opacity: 悬浮窗透明度，0为完全透明，1为完全不透明，默认0.8
showHeader: 显示表头，默认true
showIcon: 显示目标图标，默认true
showName: 显示目标ID，默认false
abbrId: 目标ID缩写（只有在showName=true时才有效），默认true
anonymous: 目标ID改为职业名（只有在showName=true时才有效），默认true
replaceWithYou: 目标是玩家本人替换为YOU（只有在showName=true时才有效），默认false
parseAA: 解析自动攻击（仅影响新记录，历史结果不会同步改变），默认true
parseDoT: 解析DoT（仅影响新记录，历史结果不会同步改变），默认false
minimize: 启动时迷你化，默认false
actionCN: action显示中文化，默认true
statusCN: status显示中文化，默认true
    `,src:"keigennRecord2.webp"},{title:"全副本发宏/标点",type:"网页",path:"zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws",src:"zoneMacro.webp",comment:`需开启 ACT.OverlayPlugin WSServer
 喊话、标点需<a href="https://github.com/Natsukage/PostNamazu">鲶鱼精邮差</a>`},{title:"[悬浮窗] 团辅监控",type:"悬浮窗",path:"https://souma.diemoe.net/dist/keySkillTimer.html?international=false&dajinengTTS=true&jianshangTTS=true&tuanfuTTS=true",comment:`URL地址栏参数说明：
international: 是否采用国际服技改数据，默认false
dajinengTTS: 是否开启大技能TTS（坦克无敌不包含在内，因为 Cactbot 已有对应功能），默认true
jianshangTTS: 是否开启减伤TTS，默认true
tuanfuTTS: 是否开启团辅TTS，默认true

该悬浮窗过于老旧，无法自定义技能。
`,src:"keySkillTimer.webp"},{title:"[悬浮窗] 技能监控",type:"悬浮窗",path:"https://souma.diemoe.net/dist/teamWatch.html",comment:`可以实现对大部分技能的CD监控。
现已进入维护阶段，不再新增特性。
不支持“释放某技能时减少某技能N秒冷却”的特性。
老用户如果有6.0的缓存，更新7.0之后用会有问题，请在设置页清除一次数据。`,src:"teamWatch.webp"},{title:"[悬浮窗] 施法监控（技能展示）",type:"悬浮窗",path:"castingMonitor?duration=15&displayAA=false&api=cafemaker&showHeader=true&syncFocusWS=false",src:"castingMonitor.webp",comment:`URL地址栏参数说明：
duration: 图片从右划到左的动画持续时间（越短速度越快），默认15
displayAA: 是否显示自动攻击，默认false
api: 技能图标图床来源，国内建议cafemaker，外网则选择xivapi，默认cafemaker
showHeader: 是否显示悬浮窗头部的队员选择器（用于切换监控目标），默认true
syncFocusWS: 是否同步监控目标至通过 WebSocket 连接的其他页面（例如OBS），默认false

若使用时感觉有点卡，技能图是一段一段的挪动的，可以在悬浮窗的[高级]设置，增加[最大帧速率（FPS）]到60。
`},{title:"[悬浮窗] 读条汉化",type:"悬浮窗",path:"castingToChinese",comment:"",src:"castingToChinese.webp"},{title:"[悬浮窗] OBS 自动录制 2（新）",type:"悬浮窗",path:"obs2",comment:"满足条件时自动开启 OBS 录屏"},{title:"[悬浮窗] OBS 自动录制（旧）",type:"悬浮窗",path:"obs",comment:"满足条件时自动开启 OBS 录屏"},{title:"[悬浮窗] 盾值显示",type:"悬浮窗",path:"showBarrier?lineHeight=1&fontSize=26&type=1&showSettings=1",comment:`速刷用，显示小队成员的现有护盾值。

URL地址栏参数说明：
lineHeight: 行高，默认1
fontSize: 字体尺寸，默认26
type: 显示方式 1=仅显示百分比 2=仅显示数值 3=同时显示，默认1
showSettings: 显示排序设置与人名，默认1，即显示，使用之前需要将其与游戏内的'小队列表'-'职能内排序顺序'保持一致，设置好了再改为0隐藏

盾值百分比为四舍五入，数值也是根据百分比计算的值，故都存在误差，无法更精准。
`},{title:"[悬浮窗] LB 额外增长监控",type:"悬浮窗",path:"https://souma.diemoe.net/dist/limitBreakTip.html?LBMax=30000&automatic=220",comment:"速刷用，记录LB奖励数值。",src:"limitBreakTip.webp"},{title:"[悬浮窗] DNC 触发倒计时显示",type:"悬浮窗",path:"jobs/dnc",comment:"在技能上显示buff消失倒计时，防止你丢失触发。仅包含6.X技能。7.0未适配，因为改的太蠢，我不玩了",src:"dnc.webp"},{title:"[悬浮窗] 一键 VPR 连击",type:"悬浮窗",path:"okVpr",comment:`<a href="#/okVpr">版本A</a>，进附体时不会重置热键栏，适合直接设置成单独键位（我没用过，不知道好不好用）
<a href="#/okVpr2">版本B</a>，进附体时会重置热键栏，适合设置成平时按的键位（我没用过，不知道好不好用）`},{title:"[悬浮窗] 我 TM 现在在几线？",type:"悬浮窗",path:"instancedAreaInfo",comment:"狩猎常用，一个简单的小工具，显示你当前在几线。"},{title:"狩猎车头找怪工具",type:"网页",path:"hunt"},{title:"简易风脉地图",type:"网页",path:"aether"}];return(p,ee)=>{const d=x,f=N,b=l("router-link"),c=l("vxe-column"),g=l("vxe-table"),y=A,v=R,w=k("lazy");return o(),i("div",G,[a(v,{class:"main-container"},{default:t(()=>[a(d,null,{default:t(()=>[Y]),_:1}),a(y,null,{default:t(()=>[a(f,{class:"contact-card"},{header:t(()=>[q]),default:t(()=>[Q]),_:1}),a(g,{data:h,stripe:"",border:"","row-config":{height:120,hover:!0},"scroll-x":{enabled:!0},fit:!0,"auto-resize":!0,class:"custom-table"},{default:t(()=>[a(c,{width:"250",title:"名称","class-name":"column-title"},{default:t(({row:e})=>[e.path.startsWith("http")?(o(),i("a",{key:1,href:e.path,target:"_blank",class:"table-link"},_(e.title),9,X)):(o(),T(b,{key:0,to:e.path,class:"table-link"},{default:t(()=>[C(_(e.title),1)]),_:2},1032,["to"]))]),_:1}),a(c,{width:"400",title:"预览","class-name":"column-title"},{default:t(({row:{src:e}})=>[e?B((o(),i("img",$,null,512)),[[w,u(e).pathname]]):m("",!0),e?m("",!0):(o(),i("i",J,"无"))]),_:1}),a(c,{field:"comment",title:"描述","min-width":"600","class-name":"column-title"},{default:t(({row:e})=>[s("span",{innerHTML:e.comment},null,8,K)]),_:1})]),_:1})]),_:1})]),_:1})])}}});const ae=L(Z,[["__scopeId","data-v-8889d223"]]);export{ae as default};