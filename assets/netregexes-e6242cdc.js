var ce=Object.defineProperty;var pe=(i,e,t)=>e in i?ce(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var Y=(i,e,t)=>(pe(i,typeof e!="symbol"?e+"":e,t),t);const ue=["CurrentWorldID","WorldID","WorldName","BNpcID","BNpcNameID","PartyType","ID","OwnerID","WeaponId","Type","Job","Level","Name","CurrentHP","MaxHP","CurrentMP","MaxMP","PosX","PosY","PosZ","Heading","MonsterType","Status","ModelStatus","AggressionStatus","TargetID","IsTargetable","Radius","Distance","EffectiveDistance","NPCTargetID","CurrentGP","MaxGP","CurrentCP","MaxCP","PCTargetID","IsCasting1","IsCasting2","CastBuffID","CastTargetID","CastDurationCurrent","CastDurationMax","TransformationId"],me={GameLog:{type:"00",name:"GameLog",source:"FFXIV_ACT_Plugin",messageType:"ChatLog",fields:{type:0,timestamp:1,code:2,name:3,line:4},subFields:{code:{"0039":{name:"message",canAnonymize:!0},"0038":{name:"echo",canAnonymize:!0},"0044":{name:"dialog",canAnonymize:!0},"0839":{name:"message",canAnonymize:!0}}},firstOptionalField:void 0},ChangeZone:{type:"01",name:"ChangeZone",source:"FFXIV_ACT_Plugin",messageType:"Territory",fields:{type:0,timestamp:1,id:2,name:3},lastInclude:!0,canAnonymize:!0,firstOptionalField:void 0},ChangedPlayer:{type:"02",name:"ChangedPlayer",source:"FFXIV_ACT_Plugin",messageType:"ChangePrimaryPlayer",fields:{type:0,timestamp:1,id:2,name:3},playerIds:{2:3},lastInclude:!0,canAnonymize:!0,firstOptionalField:void 0},AddedCombatant:{type:"03",name:"AddedCombatant",source:"FFXIV_ACT_Plugin",messageType:"AddCombatant",fields:{type:0,timestamp:1,id:2,name:3,job:4,level:5,ownerId:6,worldId:7,world:8,npcNameId:9,npcBaseId:10,currentHp:11,hp:12,currentMp:13,mp:14,x:17,y:18,z:19,heading:20},playerIds:{2:3,6:null},canAnonymize:!0,firstOptionalField:void 0},RemovedCombatant:{type:"04",name:"RemovedCombatant",source:"FFXIV_ACT_Plugin",messageType:"RemoveCombatant",fields:{type:0,timestamp:1,id:2,name:3,job:4,level:5,owner:6,world:8,npcNameId:9,npcBaseId:10,hp:12,x:17,y:18,z:19,heading:20},playerIds:{2:3,6:null},canAnonymize:!0,firstOptionalField:void 0},PartyList:{type:"11",name:"PartyList",source:"FFXIV_ACT_Plugin",messageType:"PartyList",fields:{type:0,timestamp:1,partyCount:2,id0:3,id1:4,id2:5,id3:6,id4:7,id5:8,id6:9,id7:10,id8:11,id9:12,id10:13,id11:14,id12:15,id13:16,id14:17,id15:18,id16:19,id17:20,id18:21,id19:22,id20:23,id21:24,id22:25,id23:26},playerIds:{3:null,4:null,5:null,6:null,7:null,8:null,9:null,10:null,11:null,12:null,13:null,14:null,15:null,16:null,17:null,18:null,19:null,20:null,21:null,22:null,23:null,24:null,25:null,26:null},firstOptionalField:3,canAnonymize:!0,lastInclude:!0},PlayerStats:{type:"12",name:"PlayerStats",source:"FFXIV_ACT_Plugin",messageType:"PlayerStats",fields:{type:0,timestamp:1,job:2,strength:3,dexterity:4,vitality:5,intelligence:6,mind:7,piety:8,attackPower:9,directHit:10,criticalHit:11,attackMagicPotency:12,healMagicPotency:13,determination:14,skillSpeed:15,spellSpeed:16,tenacity:18,localContentId:19},canAnonymize:!0,lastInclude:!0,firstOptionalField:void 0},StartsUsing:{type:"20",name:"StartsUsing",source:"FFXIV_ACT_Plugin",messageType:"StartsCasting",fields:{type:0,timestamp:1,sourceId:2,source:3,id:4,ability:5,targetId:6,target:7,castTime:8,x:9,y:10,z:11,heading:12},possibleRsvFields:[5],blankFields:[6],playerIds:{2:3,6:7},canAnonymize:!0,firstOptionalField:void 0},Ability:{type:"21",name:"Ability",source:"FFXIV_ACT_Plugin",messageType:"ActionEffect",fields:{type:0,timestamp:1,sourceId:2,source:3,id:4,ability:5,targetId:6,target:7,flags:8,damage:9,targetCurrentHp:24,targetMaxHp:25,targetCurrentMp:26,targetMaxMp:27,targetX:30,targetY:31,targetZ:32,targetHeading:33,currentHp:34,maxHp:35,currentMp:36,maxMp:37,x:40,y:41,z:42,heading:43,sequence:44,targetIndex:45,targetCount:46},possibleRsvFields:[5],playerIds:{2:3,6:7},blankFields:[6],canAnonymize:!0,firstOptionalField:void 0},NetworkAOEAbility:{type:"22",name:"NetworkAOEAbility",source:"FFXIV_ACT_Plugin",messageType:"AOEActionEffect",fields:{type:0,timestamp:1,sourceId:2,source:3,id:4,ability:5,targetId:6,target:7,flags:8,damage:9,targetCurrentHp:24,targetMaxHp:25,targetCurrentMp:26,targetMaxMp:27,targetX:30,targetY:31,targetZ:32,targetHeading:33,currentHp:34,maxHp:35,currentMp:36,maxMp:37,x:40,y:41,z:42,heading:43,sequence:44,targetIndex:45,targetCount:46},possibleRsvFields:[5],playerIds:{2:3,6:7},blankFields:[6],canAnonymize:!0,firstOptionalField:void 0},NetworkCancelAbility:{type:"23",name:"NetworkCancelAbility",source:"FFXIV_ACT_Plugin",messageType:"CancelAction",fields:{type:0,timestamp:1,sourceId:2,source:3,id:4,name:5,reason:6},possibleRsvFields:[5],playerIds:{2:3},canAnonymize:!0,firstOptionalField:void 0},NetworkDoT:{type:"24",name:"NetworkDoT",source:"FFXIV_ACT_Plugin",messageType:"DoTHoT",fields:{type:0,timestamp:1,id:2,name:3,which:4,effectId:5,damage:6,currentHp:7,maxHp:8,currentMp:9,maxMp:10,x:13,y:14,z:15,heading:16,sourceId:17,source:18,damageType:19,sourceCurrentHp:20,sourceMaxHp:21,sourceCurrentMp:22,sourceMaxMp:23,sourceX:26,sourceY:27,sourceZ:28,sourceHeading:29},playerIds:{2:3,17:18},canAnonymize:!0,firstOptionalField:void 0},WasDefeated:{type:"25",name:"WasDefeated",source:"FFXIV_ACT_Plugin",messageType:"Death",fields:{type:0,timestamp:1,targetId:2,target:3,sourceId:4,source:5},playerIds:{2:3,4:5},canAnonymize:!0,firstOptionalField:void 0},GainsEffect:{type:"26",name:"GainsEffect",source:"FFXIV_ACT_Plugin",messageType:"StatusAdd",fields:{type:0,timestamp:1,effectId:2,effect:3,duration:4,sourceId:5,source:6,targetId:7,target:8,count:9,targetMaxHp:10,sourceMaxHp:11},possibleRsvFields:[3],playerIds:{5:6,7:8},canAnonymize:!0,firstOptionalField:void 0},HeadMarker:{type:"27",name:"HeadMarker",source:"FFXIV_ACT_Plugin",messageType:"TargetIcon",fields:{type:0,timestamp:1,targetId:2,target:3,id:6},playerIds:{2:3},canAnonymize:!0,firstOptionalField:void 0},NetworkRaidMarker:{type:"28",name:"NetworkRaidMarker",source:"FFXIV_ACT_Plugin",messageType:"WaymarkMarker",fields:{type:0,timestamp:1,operation:2,waymark:3,id:4,name:5,x:6,y:7,z:8},playerIds:{4:5},canAnonymize:!0,firstOptionalField:void 0},NetworkTargetMarker:{type:"29",name:"NetworkTargetMarker",source:"FFXIV_ACT_Plugin",messageType:"SignMarker",fields:{type:0,timestamp:1,operation:2,waymark:3,id:4,name:5,targetId:6,targetName:7},playerIds:{4:5,6:7},firstOptionalField:void 0},LosesEffect:{type:"30",name:"LosesEffect",source:"FFXIV_ACT_Plugin",messageType:"StatusRemove",fields:{type:0,timestamp:1,effectId:2,effect:3,sourceId:5,source:6,targetId:7,target:8,count:9},possibleRsvFields:[3],playerIds:{5:6,7:8},canAnonymize:!0,firstOptionalField:void 0},NetworkGauge:{type:"31",name:"NetworkGauge",source:"FFXIV_ACT_Plugin",messageType:"Gauge",fields:{type:0,timestamp:1,id:2,data0:3,data1:4,data2:5,data3:6},playerIds:{2:null},firstUnknownField:3,canAnonymize:!0,firstOptionalField:void 0},NetworkWorld:{type:"32",name:"NetworkWorld",source:"FFXIV_ACT_Plugin",messageType:"World",fields:{type:0,timestamp:1},isUnknown:!0,firstOptionalField:void 0},ActorControl:{type:"33",name:"ActorControl",source:"FFXIV_ACT_Plugin",messageType:"Director",fields:{type:0,timestamp:1,instance:2,command:3,data0:4,data1:5,data2:6,data3:7},canAnonymize:!0,firstOptionalField:void 0},NameToggle:{type:"34",name:"NameToggle",source:"FFXIV_ACT_Plugin",messageType:"NameToggle",fields:{type:0,timestamp:1,id:2,name:3,targetId:4,targetName:5,toggle:6},playerIds:{2:3,4:5},canAnonymize:!0,firstOptionalField:void 0},Tether:{type:"35",name:"Tether",source:"FFXIV_ACT_Plugin",messageType:"Tether",fields:{type:0,timestamp:1,sourceId:2,source:3,targetId:4,target:5,id:8},playerIds:{2:3,4:5},canAnonymize:!0,firstUnknownField:9,firstOptionalField:void 0},LimitBreak:{type:"36",name:"LimitBreak",source:"FFXIV_ACT_Plugin",messageType:"LimitBreak",fields:{type:0,timestamp:1,valueHex:2,bars:3},canAnonymize:!0,firstOptionalField:void 0},NetworkEffectResult:{type:"37",name:"NetworkEffectResult",source:"FFXIV_ACT_Plugin",messageType:"EffectResult",fields:{type:0,timestamp:1,id:2,name:3,sequenceId:4,currentHp:5,maxHp:6,currentMp:7,maxMp:8,currentShield:9,x:11,y:12,z:13,heading:14},playerIds:{2:3},firstUnknownField:22,canAnonymize:!0,firstOptionalField:void 0},StatusEffect:{type:"38",name:"StatusEffect",source:"FFXIV_ACT_Plugin",messageType:"StatusList",fields:{type:0,timestamp:1,targetId:2,target:3,jobLevelData:4,hp:5,maxHp:6,mp:7,maxMp:8,currentShield:9,x:11,y:12,z:13,heading:14,data0:15,data1:16,data2:17,data3:18,data4:19,data5:20},playerIds:{2:3},firstUnknownField:18,canAnonymize:!0,firstOptionalField:18},NetworkUpdateHP:{type:"39",name:"NetworkUpdateHP",source:"FFXIV_ACT_Plugin",messageType:"UpdateHp",fields:{type:0,timestamp:1,id:2,name:3,currentHp:4,maxHp:5,currentMp:6,maxMp:7,x:10,y:11,z:12,heading:13},playerIds:{2:3},canAnonymize:!0,firstOptionalField:void 0},Map:{type:"40",name:"Map",source:"FFXIV_ACT_Plugin",messageType:"ChangeMap",fields:{type:0,timestamp:1,id:2,regionName:3,placeName:4,placeNameSub:5},canAnonymize:!0,firstOptionalField:void 0,lastInclude:!0},SystemLogMessage:{type:"41",name:"SystemLogMessage",source:"FFXIV_ACT_Plugin",messageType:"SystemLogMessage",fields:{type:0,timestamp:1,instance:2,id:3,param0:4,param1:5,param2:6},canAnonymize:!0,firstOptionalField:void 0},StatusList3:{type:"42",name:"StatusList3",source:"FFXIV_ACT_Plugin",messageType:"StatusList3",fields:{type:0,timestamp:1,id:2,name:3},playerIds:{2:3},canAnonymize:!0,firstOptionalField:4,firstUnknownField:4},ParserInfo:{type:"249",name:"ParserInfo",source:"FFXIV_ACT_Plugin",messageType:"Settings",fields:{type:0,timestamp:1},globalInclude:!0,canAnonymize:!0,firstOptionalField:void 0},ProcessInfo:{type:"250",name:"ProcessInfo",source:"FFXIV_ACT_Plugin",messageType:"Process",fields:{type:0,timestamp:1},globalInclude:!0,canAnonymize:!0,firstOptionalField:void 0},Debug:{type:"251",name:"Debug",source:"FFXIV_ACT_Plugin",messageType:"Debug",fields:{type:0,timestamp:1},globalInclude:!0,canAnonymize:!1,firstOptionalField:void 0},PacketDump:{type:"252",name:"PacketDump",source:"FFXIV_ACT_Plugin",messageType:"PacketDump",fields:{type:0,timestamp:1},canAnonymize:!1,firstOptionalField:void 0},Version:{type:"253",name:"Version",source:"FFXIV_ACT_Plugin",messageType:"Version",fields:{type:0,timestamp:1},globalInclude:!0,canAnonymize:!0,firstOptionalField:void 0},Error:{type:"254",name:"Error",source:"FFXIV_ACT_Plugin",messageType:"Error",fields:{type:0,timestamp:1},canAnonymize:!1,firstOptionalField:void 0},None:{type:"[0-9]+",name:"None",source:"FFXIV_ACT_Plugin",messageType:"None",fields:{type:0,timestamp:1},isUnknown:!0,firstOptionalField:void 0},LineRegistration:{type:"256",name:"LineRegistration",source:"OverlayPlugin",messageType:"256",fields:{type:0,timestamp:1,id:2,source:3,version:4},globalInclude:!0,canAnonymize:!0,firstOptionalField:void 0},MapEffect:{type:"257",name:"MapEffect",source:"OverlayPlugin",messageType:"257",fields:{type:0,timestamp:1,instance:2,flags:3,location:4,data0:5,data1:6},canAnonymize:!0,firstOptionalField:void 0},FateDirector:{type:"258",name:"FateDirector",source:"OverlayPlugin",messageType:"258",fields:{type:0,timestamp:1,category:2,fateId:4,progress:5},canAnonymize:!0,firstOptionalField:void 0},CEDirector:{type:"259",name:"CEDirector",source:"OverlayPlugin",messageType:"259",fields:{type:0,timestamp:1,popTime:2,timeRemaining:3,ceKey:5,numPlayers:6,status:7,progress:9},canAnonymize:!0,firstOptionalField:void 0},InCombat:{type:"260",name:"InCombat",source:"OverlayPlugin",messageType:"260",fields:{type:0,timestamp:1,inACTCombat:2,inGameCombat:3,isACTChanged:4,isGameChanged:5},canAnonymize:!0,firstOptionalField:void 0},CombatantMemory:{type:"261",name:"CombatantMemory",source:"OverlayPlugin",messageType:"261",fields:{type:0,timestamp:1,change:2,id:3},canAnonymize:!0,firstOptionalField:5,firstUnknownField:4,playerIds:{3:null},repeatingFields:{startingIndex:4,label:"pair",names:["key","value"],sortKeys:!0,primaryKey:"key",possibleKeys:ue}},RSVData:{type:"262",name:"RSVData",source:"OverlayPlugin",messageType:"262",fields:{type:0,timestamp:1,locale:2,key:4,value:5},canAnonymize:!0,firstOptionalField:void 0},StartsUsingExtra:{type:"263",name:"StartsUsingExtra",source:"OverlayPlugin",messageType:"263",fields:{type:0,timestamp:1,sourceId:2,id:3,x:4,y:5,z:6,heading:7},playerIds:{2:null},canAnonymize:!0,firstOptionalField:7},AbilityExtra:{type:"264",name:"AbilityExtra",source:"OverlayPlugin",messageType:"264",fields:{type:0,timestamp:1,sourceId:2,id:3,globalEffectCounter:4,dataFlag:5,x:6,y:7,z:8,heading:9},blankFields:[6],playerIds:{2:null},canAnonymize:!0,firstOptionalField:9}},ee={latest:me},ye=ee;console.assert(ye);const Q=ee.latest;class le extends Error{constructor(){super("This code shouldn't be reached")}}const te=":",D="[^:]*",ge="(?:[^:]|: )*?",fe=["effect","ability"],Fe=(i,e,t)=>{const a=ee[e][i];t===void 0&&(t=Object.keys(a.fields),"repeatingFields"in a&&t.push(a.repeatingFields.label));const n={},o=a.firstOptionalField;for(const[l,C]of Object.entries(a.fields)){if(!t.includes(l))continue;const E={field:l,optional:o!==void 0&&C>=o};l==="type"&&(E.value=a.type),n[C]=E}return"repeatingFields"in a&&t.includes(a.repeatingFields.label)&&(n[a.repeatingFields.startingIndex]={field:a.repeatingFields.label,optional:o!==void 0&&a.repeatingFields.startingIndex>=o,repeating:!0,repeatingKeys:[...a.repeatingFields.names],sortKeys:a.repeatingFields.sortKeys,primaryKey:a.repeatingFields.primaryKey,possibleKeys:[...a.repeatingFields.possibleKeys]}),n},Ie=(i,e)=>{if(i!==!0)return!1;if(e===void 0)return!0;if(!Array.isArray(e))return!1;for(const t of e)if(typeof t!="object")return!1;return!0},Ce=(i,e,t)=>{var K,j,G,W,Z,s,y,k,L;i=i??{};const a=[];for(const r in t){const u=t[r];u&&a.push(u.field)}I.validateParams(i,e,["capture",...a]);const n=I.trueIfUndefined(i.capture),o=Object.keys(t).sort((r,u)=>parseInt(r)-parseInt(u));let l;if(n){const r=[];for(const g in t)r.push(g);let u=r.pop();if(u===void 0)l=o[o.length-1]??"0";else{for(;(K=t[u])!=null&&K.optional&&!((((j=t[u])==null?void 0:j.field)??"")in i);)u=r.pop();l=u??"0"}}else{l="0";for(const r in t){if(typeof(t[r]??{})!="object")continue;const g=(G=t[r])==null?void 0:G.field;g!==void 0&&g in i&&(l=r)}}const C=parseInt(l),E=`(?:${Q.Ability.messageType}|${Q.NetworkAOEAbility.messageType})`,re="(?:15|16)",M=e!=="Ability"?Q[e].messageType:E,X=parseInt(Q[e].type).toString(16).toUpperCase(),J=X.length<2?`00${X}`.slice(-2):X,R=e!=="Ability"?J:re;let T="";n?T+=`(?<timestamp>\\y{Timestamp}) ${M} (?<type>${R})`:T+=`\\y{Timestamp} ${M} ${R}`;let U=1;for(const r in t){const u=t[r];if(u===void 0)continue;const g=u.field;if(g==="timestamp"||g==="type")continue;const z=parseInt(r),B=z-U-1;if(B===1?T+=`${te}${D}`:B>1&&(T+=`(?:${te}${D}){${B}}`),U=z,T+=te,typeof u!="object")throw new Error(`${e}: invalid value: ${JSON.stringify(u)}`);const O=g!==void 0&&fe.includes(g)?ge:D,P=((W=u.value)==null?void 0:W.toString())??O,V=i[g];if(Ie((Z=t[r])==null?void 0:Z.repeating,V)){const A="(?:$|:)";let m=V;const N=(s=t[r])==null?void 0:s.sortKeys,f=(y=t[r])==null?void 0:y.primaryKey,h=(k=t[r])==null?void 0:k.possibleKeys;if(f===void 0||h===void 0)throw new le;N&&(h.sort((d,F)=>d.toLowerCase().localeCompare(F.toLowerCase())),m!==void 0&&(m=[...m].sort((d,F)=>{if(typeof d!="object"||d[f]===void 0)return console.warn("Invalid argument passed to trigger:",d),0;const _=d[f];if(typeof _!="string"||!(h!=null&&h.includes(_)))return console.warn("Invalid argument passed to trigger:",d),0;if(typeof F!="object"||F[f]===void 0)return console.warn("Invalid argument passed to trigger:",F),0;const $=F[f];return typeof $!="string"||!(h!=null&&h.includes($))?(console.warn("Invalid argument passed to trigger:",F),0):_.toLowerCase().localeCompare($.toLowerCase())})));const w=m;h.forEach(d=>{var $,oe;const F=w==null?void 0:w.find(S=>f in S&&S[f]===d);let _="";(oe=($=t[r])==null?void 0:$.repeatingKeys)==null||oe.forEach(S=>{let x=F==null?void 0:F[S];(F===void 0||!(S in F))&&(S===f?x=d:x=D),typeof x!="string"&&(Array.isArray(x)?(x.length<1||x.some(de=>typeof de!="string"))&&(x=D):x=D),_+=I.maybeCapture(S===f?!1:n,g+d,x,P)+A}),_.length>0&&(T+=`(?:${_})${F!==void 0?"":"?"}`)})}else(L=t[r])!=null&&L.repeating||(g!==void 0?T+=I.maybeCapture(n,g,V,P):T+=V);if(z>=C)break}return T+="(?:$|:)",I.parse(T)},c=(i,e)=>Ce(e,i,Fe(i,I.logVersion)),b=class b{static startsUsing(e){return c("StartsUsing",e)}static ability(e){return c("Ability",e)}static abilityFull(e){return this.ability(e)}static headMarker(e){return c("HeadMarker",e)}static addedCombatant(e){return c("AddedCombatant",e)}static addedCombatantFull(e){return this.addedCombatant(e)}static removingCombatant(e){return c("RemovedCombatant",e)}static gainsEffect(e){return c("GainsEffect",e)}static statusEffectExplicit(e){return c("StatusEffect",e)}static losesEffect(e){return c("LosesEffect",e)}static tether(e){return c("Tether",e)}static wasDefeated(e){return c("WasDefeated",e)}static networkDoT(e){return c("NetworkDoT",e)}static echo(e){return typeof e>"u"&&(e={}),b.validateParams(e,"echo",["type","timestamp","code","name","line","capture"]),e.code="0038",b.gameLog(e)}static dialog(e){return typeof e>"u"&&(e={}),b.validateParams(e,"dialog",["type","timestamp","code","name","line","capture"]),e.code="0044",b.gameLog(e)}static message(e){return typeof e>"u"&&(e={}),b.validateParams(e,"message",["type","timestamp","code","name","line","capture"]),e.code="0839",b.gameLog(e)}static gameLog(e){return c("GameLog",e)}static gameNameLog(e){return b.gameLog(e)}static statChange(e){return c("PlayerStats",e)}static changeZone(e){return c("ChangeZone",e)}static network6d(e){return c("ActorControl",e)}static nameToggle(e){return c("NameToggle",e)}static map(e){return c("Map",e)}static systemLogMessage(e){return c("SystemLogMessage",e)}static mapEffect(e){return c("MapEffect",e)}static combatantMemory(e){return c("CombatantMemory",e)}static startsUsingExtra(e){return c("StartsUsingExtra",e)}static abilityExtra(e){return c("AbilityExtra",e)}static maybeCapture(e,t,a,n){return a===void 0&&(a=n??D),a=b.anyOf(a),e?b.namedCapture(t,a):a}static optional(e){return`(?:${e})?`}static namedCapture(e,t){return e.includes(">")&&console.error(`"${e}" contains ">".`),e.includes("<")&&console.error(`"${e}" contains ">".`),`(?<${e}>${t})`}static anyOf(...e){const t=o=>{const[l]=o;return l!==void 0&&o.length===1?`${l instanceof RegExp?l.source:l}`:`(?:${o.map(C=>C instanceof RegExp?C.source:C).join("|")})`};let a=[];const[n]=e;return e.length===1?typeof n=="string"||n instanceof RegExp?a=[n]:Array.isArray(n)?a=n:a=[]:a=e,t(a)}static parse(e){const t={Timestamp:"^.{14}",NetTimestamp:".{33}",NetField:"(?:[^|]*\\|)",LogType:"[0-9A-Fa-f]{2}",AbilityCode:"[0-9A-Fa-f]{1,8}",ObjectId:"[0-9A-F]{8}",Name:"(?:[^\\s:|]+(?: [^\\s:|]+)?|)",Float:"-?[0-9]+(?:[.,][0-9]+)?(?:E-?[0-9]+)?"};let a="i";return e instanceof RegExp&&(a+=(e.global?"g":"")+(e.multiline?"m":""),e=e.source),e=e.replace(/\\y\{(.*?)\}/g,(n,o)=>t[o]||n),new RegExp(e,a)}static parseGlobal(e){const t=b.parse(e);let a="gi";return e instanceof RegExp&&(a+=e.multiline?"m":""),new RegExp(t.source,a)}static trueIfUndefined(e){return typeof e>"u"?!0:!!e}static validateParams(e,t,a){if(e===null||typeof e!="object")return;const n=Object.keys(e);for(const o of n)if(!a.includes(o))throw new Error(`${t}: invalid parameter '${o}'.  Valid params: ${JSON.stringify(a)}`)}};Y(b,"logVersion","latest");let I=b;const ae="\\|",q="[^|]*",Te="^^",Ae=/^\^\^/,be=["ability","name","source","target","line"],ve=be,ie={echo:"0038",dialog:"0044",message:"0839"},ne=(i,e,t)=>{const a=ee[e][i];t===void 0&&(t=Object.keys(a.fields),"repeatingFields"in a&&t.push(a.repeatingFields.label));const n={},o=a.firstOptionalField;for(const[l,C]of Object.entries(a.fields)){if(!t.includes(l))continue;const E={field:l,optional:o!==void 0&&C>=o};l==="type"&&(E.value=a.type),n[C]=E}return"repeatingFields"in a&&t.includes(a.repeatingFields.label)&&(n[a.repeatingFields.startingIndex]={field:a.repeatingFields.label,optional:o!==void 0&&a.repeatingFields.startingIndex>=o,repeating:!0,repeatingKeys:[...a.repeatingFields.names],sortKeys:a.repeatingFields.sortKeys,primaryKey:a.repeatingFields.primaryKey,possibleKeys:[...a.repeatingFields.possibleKeys]}),n},Pe=(i,e)=>{if(i!==!0)return!1;if(e===void 0)return!0;if(!Array.isArray(e))return!1;for(const t of e)if(typeof t!="object")return!1;return!0},se=(i,e,t)=>{var J,R,T,U,K,j,G,W,Z;i=i??{};const a=[];for(const s in t){const y=t[s];y&&a.push(y.field)}I.validateParams(i,e,["capture",...a]);const n=I.trueIfUndefined(i.capture),o=Object.keys(t).sort((s,y)=>parseInt(s)-parseInt(y));let l;if(n){const s=[];for(const k in t)s.push(k);let y=s.pop();if(y===void 0)l=o[o.length-1]??"0";else{for(;(J=t[y])!=null&&J.optional&&!((((R=t[y])==null?void 0:R.field)??"")in i);)y=s.pop();l=y??"0"}}else{l="0";for(const s in t){if(typeof(t[s]??{})!="object")continue;const k=(T=t[s])==null?void 0:T.field;k!==void 0&&k in i&&(l=s)}}const C=parseInt(l),E=Object.keys(i).filter(s=>ve.includes(s));let M=H.flagTranslationsNeeded&&E.length>0?Te:"^",X=-1;for(const s in t){const y=parseInt(s),k=y-X-1;k===1?M+="\\y{NetField}":k>1&&(M+=`\\y{NetField}{${k}}`),X=y;const L=t[s];if(typeof L!="object")throw new Error(`${e}: invalid value: ${JSON.stringify(L)}`);const r=L.field,u=((U=L.value)==null?void 0:U.toString())??q,g=i[r];if(Pe((K=t[s])==null?void 0:K.repeating,g)){let z=g;const B=(j=t[s])==null?void 0:j.sortKeys,O=(G=t[s])==null?void 0:G.primaryKey,P=(W=t[s])==null?void 0:W.possibleKeys;if(O===void 0||P===void 0)throw new le;B&&(P.sort((A,m)=>A.toLowerCase().localeCompare(m.toLowerCase())),z!==void 0&&(z=[...z].sort((A,m)=>{if(typeof A!="object"||A[O]===void 0)return console.warn("Invalid argument passed to trigger:",A),0;const N=A[O];if(typeof N!="string"||!(P!=null&&P.includes(N)))return console.warn("Invalid argument passed to trigger:",A),0;if(typeof m!="object"||m[O]===void 0)return console.warn("Invalid argument passed to trigger:",m),0;const f=m[O];return typeof f!="string"||!(P!=null&&P.includes(f))?(console.warn("Invalid argument passed to trigger:",m),0):N.toLowerCase().localeCompare(f.toLowerCase())})));const V=z;P.forEach(A=>{var f,h;const m=V==null?void 0:V.find(w=>O in w&&w[O]===A);let N="";(h=(f=t[s])==null?void 0:f.repeatingKeys)==null||h.forEach(w=>{let d=m==null?void 0:m[w];(m===void 0||!(w in m))&&(w===O?d=A:d=q),typeof d!="string"&&(Array.isArray(d)?(d.length<1||d.some(F=>typeof F!="string"))&&(d=q):d=q),N+=I.maybeCapture(w===O?!1:n,r+A,d,u)+ae}),N.length>0&&(M+=`(?:${N})${m!==void 0?"":"?"}`)})}else(Z=t[s])!=null&&Z.repeating||(r!==void 0?M+=I.maybeCapture(n,r,g,u)+ae:M+=u+ae);if(y>=C)break}return I.parse(M)},p=(i,e)=>se(e,i,ne(i,H.logVersion)),v=class v{static setFlagTranslationsNeeded(e){v.flagTranslationsNeeded=e}static doesNetRegexNeedTranslation(e){console.assert(v.flagTranslationsNeeded);const t=typeof e=="string"?e:e.source;return!!Ae.exec(t)}static startsUsing(e){return p("StartsUsing",e)}static ability(e){return se(e,"Ability",{...ne("Ability",v.logVersion),0:{field:"type",value:"2[12]",optional:!1}})}static abilityFull(e){return this.ability(e)}static headMarker(e){return p("HeadMarker",e)}static addedCombatant(e){return se(e,"AddedCombatant",ne("AddedCombatant",v.logVersion))}static addedCombatantFull(e){return v.addedCombatant(e)}static removingCombatant(e){return p("RemovedCombatant",e)}static gainsEffect(e){return p("GainsEffect",e)}static statusEffectExplicit(e){return p("StatusEffect",e)}static losesEffect(e){return p("LosesEffect",e)}static tether(e){return p("Tether",e)}static wasDefeated(e){return p("WasDefeated",e)}static networkDoT(e){return p("NetworkDoT",e)}static echo(e){return typeof e>"u"&&(e={}),I.validateParams(e,"Echo",["type","timestamp","code","name","line","capture"]),v.gameLog({...e,code:ie.echo})}static dialog(e){return typeof e>"u"&&(e={}),I.validateParams(e,"Dialog",["type","timestamp","code","name","line","capture"]),v.gameLog({...e,code:ie.dialog})}static message(e){return typeof e>"u"&&(e={}),I.validateParams(e,"Message",["type","timestamp","code","name","line","capture"]),v.gameLog({...e,code:ie.message})}static gameLog(e){return p("GameLog",e)}static gameNameLog(e){return v.gameLog(e)}static statChange(e){return p("PlayerStats",e)}static changeZone(e){return p("ChangeZone",e)}static network6d(e){return p("ActorControl",e)}static nameToggle(e){return p("NameToggle",e)}static map(e){return p("Map",e)}static systemLogMessage(e){return p("SystemLogMessage",e)}static mapEffect(e){return p("MapEffect",e)}static fateDirector(e){return p("FateDirector",e)}static ceDirector(e){return p("CEDirector",e)}static combatantMemory(e){return p("CombatantMemory",e)}static startsUsingExtra(e){return p("StartsUsingExtra",e)}static abilityExtra(e){return p("AbilityExtra",e)}};Y(v,"logVersion","latest"),Y(v,"flagTranslationsNeeded",!1);let H=v;const ke={wipe:H.network6d({command:["40000010","4000000F"]}),cactbotWipeEcho:H.echo({line:"cactbot wipe.*?"}),userWipeEcho:H.echo({line:"end"})};export{H as N,I as R,le as U,ke as c,ie as g,Q as l};