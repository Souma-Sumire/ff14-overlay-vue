/// <reference types="vite/client" />
declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
declare var __SITE_IMG__: string;
declare var __SITE_IMG__BAK: string;
