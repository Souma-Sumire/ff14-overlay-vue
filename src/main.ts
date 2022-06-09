import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "https://overlay.diemoe.net/common/common.min.js";
import "./common/common.min.js";
import { createPinia } from "pinia";
// import "default-passive-events"; 

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.mount("#app");
