import{z as n,J as p,d,A as c,f as t,g as o,x as r,i as s,C as l,Y as i,h as u,y,a8 as m,j as f,t as h,M as v}from"./index.js";const C=n({header:{type:String,default:""},bodyStyle:{type:p([String,Object,Array]),default:""},shadow:{type:String,values:["always","hover","never"],default:"always"}}),S=d({name:"ElCard"}),w=d({...S,props:C,setup(b){const a=c("card");return(e,g)=>(t(),o("div",{class:r([s(a).b(),s(a).is(`${e.shadow}-shadow`)])},[e.$slots.header||e.header?(t(),o("div",{key:0,class:r(s(a).e("header"))},[l(e.$slots,"header",{},()=>[f(h(e.header),1)])],2)):i("v-if",!0),u("div",{class:r(s(a).e("body")),style:y(e.bodyStyle)},[l(e.$slots,"default")],6)],2))}});var _=m(w,[["__file","/home/runner/work/element-plus/element-plus/packages/components/card/src/card.vue"]]);const E=v(_);export{E};