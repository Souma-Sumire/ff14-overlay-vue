import App from "./App.vue";
import router from "./router";
// import "https://overlay.diemoe.net/common/common.min.js";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import "uno.css";

const app = createApp(App);
const head = createHead();
app.use(router);
app.use(head);
app.use(createPinia());
app.mount("#app");
