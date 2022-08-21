/// <reference types="vite/client" />
declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
declare const __SITE_IMG__: string;
declare const __SITE_IMG__BAK: string;
