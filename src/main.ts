import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
// import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "uno.css";

const app = createApp(App);
const head = createHead();
const pinia = createPinia();
// app.use(ElementPlus);
app.use(router);
app.use(head);
app.use(pinia);
app.mount("#app");
