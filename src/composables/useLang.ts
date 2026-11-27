import type { CLang, Lang } from "@/types/lang";
import { useUrlSearchParams } from "@vueuse/core";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const params = useUrlSearchParams("hash");
const urlLang = params.lang?.toString() as Lang;

// 创建一个全局的 locale ref 用于跟踪当前语言
const globalLocale = ref<Lang>(urlLang || "zhCn");
let urlLangApplied = false;

function useLang() {
  const i18n = useI18n({ useScope: "global" });

  // 仅首次初始化时应用 URL 语言参数，避免子组件挂载时覆盖运行时切换的语言
  if (urlLang && !urlLangApplied) {
    urlLangApplied = true;
    i18n.locale.value = urlLang;
    globalLocale.value = urlLang;
  } else {
    globalLocale.value = i18n.locale.value as Lang;
  }

  // 监听 i18n locale 变化,同步到 globalLocale
  watch(
    () => i18n.locale.value,
    (newLocale: string) => {
      globalLocale.value = newLocale as Lang;
    },
  );

  function setLang(lang: Lang) {
    urlLangApplied = true;
    i18n.locale.value = lang;
    globalLocale.value = lang;
  }

  return {
    ...i18n,
    setLang,
  };
}

const l: Record<Lang, CLang> = {
  en: "en",
  ja: "ja",
  zhCn: "cn",
  zhTw: "cn",
};

function localeToCactbotLang(locale: Lang): CLang {
  return l[locale] || "en";
}

function getLocaleMessage(text: Record<Lang, string>): string {
  const cLang = localeToCactbotLang(globalLocale.value);
  return text[cLang as keyof typeof text] ?? text.zhCn;
}

function getCactbotLocaleMessage(text: Partial<Record<CLang, string>>): string {
  if (!text) return "Unknown";
  const lang = localeToCactbotLang(globalLocale.value);
  return text[lang] ?? text.cn ?? `${text.en} / ${text.ja}`;
}

export { getCactbotLocaleMessage, getLocaleMessage, localeToCactbotLang, useLang };
