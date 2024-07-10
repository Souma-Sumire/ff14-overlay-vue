import{d as c,o as l,b as i,$ as t,c as d,u as a}from"./vendor-b254d16d.js";const u={class:"markdown-body"},n=t(`<h1>时间轴语法</h1><h2>显式语句（你实际上能在悬浮窗中看到的部分）</h2><h3>显式语句格式</h3><pre><code class="language-text">时间 &quot;提示文本&quot; (tts &quot;语音文本&quot;)
</code></pre><h3>显式语句参数</h3><ul><li><p>时间（数字）</p><ul><li>可以是整数，如 <code class="">34</code>；也可以是浮点数，如 <code class="">84.38</code>；还可以是时间格式，如 <code class="">01:35</code>；</li></ul></li><li><p>提示文本（字符串）</p><ul><li>文本就是显示在悬浮窗中的文本，如 <code class="">天赐祝福</code> 或 <code class="">治疗MT</code>。</li><li>你可以使用 <code class="">&lt;技能名&gt;</code> 的特殊语法，来生成一张技能图标的图片。并且可以接上一个 <code class="">~</code> 来快速在后面重复该技能名称的字符串，如 <code class="">&lt;天赐祝福&gt;~</code> 在悬浮窗中实际显示为 <code class="">[图片]天赐祝福</code></li></ul></li><li><p>语音文本（字符串）</p><ul><li>该参数用于指定该语句的语音文本，如 <code class="">tts &quot;天赐祝福&quot;</code>，则会在该语句时间判定前 1 秒，播放 <code class="">天赐祝福</code> 的语音</li></ul></li></ul><h2>匹配语句（隐藏的、用于匹配时间轴的）</h2><h3>匹配语句格式</h3><pre><code class="language-text">时间 &quot;注释文本&quot; sync /正则表达式/ window 前匹配,后匹配 jump 时间
</code></pre><h3>匹配语句参数</h3><ul><li><p>sync 正则表达式</p><ul><li>填入一个标准的 Javascript 正则表达式。用于匹配日志，若匹配成功，则触发同步（参考下方window、jump的说明）</li><li>事件修饰符：你可以在 sync 后面添加 <code class="">.once</code> 修饰符，来确保该正则表达式在整场战斗中仅会被匹配一次，如 <code class="">sync.once /正则表达式/</code></li></ul></li><li><p>window 数字,数字</p><ul><li>控制 sync 匹配的时间范围，第一个数字代表向前的时间范围，第二个数字代表向后的时间范围</li><li>例如，在：<code class="">50 &quot;同步语句&quot; sync /正则表达式/ window 2,3</code>，当正则表达式匹配，且当前战斗时间处于第 48 ~ 53 秒内，时间轴会跳转至第 50 秒</li><li>若不填写，默认为 <code class="">2.5,2.5</code></li></ul></li><li><p>jump 数字</p><ul><li>改写时间轴匹配成功时跳转的时间点，当 sync 匹配成功，且符合 window 的判定条件时候，时间轴会跳转至 <code class="">jump</code> 指定的数字时间点</li><li>只支持秒数格式，如 <code class="">120</code></li><li>例如，在：<code class="">120 &quot;分支判断&quot; sync /正则表达式/ window 20,5 jump 300</code>，当正则表达式匹配，且当前战斗时间处于第 100 ~ 125 秒内，时间轴会跳转至第 300 秒</li><li>跳转至 0 意味着停止时间轴</li></ul></li></ul><h3>自动匹配规则</h3><p>使用FFLOGS导入时，会自动生成部分匹配语句，你可以在 <a href="https://github.com/Souma-Sumire/ff14-overlay-vue/blob/main/src/utils/timelineSpecialRules.ts">timelineSpecialRules.ts</a> 查看全部预置规则</p>`,13),p=[n],r=c({__name:"timeline",setup(o,{expose:e}){return e({frontmatter:{},excerpt:void 0}),(s,h)=>(l(),i("div",u,p))}}),_=c({__name:"timelineHelp",setup(o){return(e,s)=>(l(),d(a(r)))}});export{_ as default};