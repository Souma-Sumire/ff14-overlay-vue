import { createHead } from "@vueuse/head";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
// import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "virtual:uno.css";
import VueLazyload from "vue-lazyload";
import VXETable from "vxe-table";
import "vxe-table/lib/style.css";

const app = createApp(App);
const head = createHead();
const pinia = createPinia();
// app.use(ElementPlus);
app.use(router);
app.use(head);
app.use(pinia);
app.use(VXETable);
app.use(VueLazyload);
app.mount("#app");

// app.config.errorHandler = (err, vm, info) => {
//   console.error(err, vm, info);
// };
