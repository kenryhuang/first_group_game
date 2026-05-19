import { createApp } from "vue";
import { createPinia } from "pinia";
import { gsap } from "gsap";
import App from "./app/App";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container");
}

gsap.defaults({ ease: "power2.out", duration: 0.18 });

createApp(App).use(createPinia()).mount(app);
