import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { gsap } from "gsap";
import { useGameStore } from "./gameStore";
import { PixiWastelandGame } from "../game/PixiWastelandGame";

export default defineComponent({
  name: "WastelandPrototypeApp",
  setup() {
    const gameHost = ref<HTMLDivElement | null>(null);
    const store = useGameStore();
    let game: PixiWastelandGame | undefined;

    const hudLines = computed(() => store.hudLines);

    onMounted(async () => {
      if (!gameHost.value) return;
      game = new PixiWastelandGame(gameHost.value, {
        onMetrics: (metrics) => store.syncMetrics(metrics),
        onMessage: (message) => {
          store.setMessage(message);
          gsap.fromTo(".game-message", { opacity: 0.45, y: 6 }, { opacity: 1, y: 0 });
        },
        onRunState: (runState) => store.syncRunState(runState),
      });
      await game.start();
    });

    onBeforeUnmount(() => {
      game?.destroy();
    });

    return () =>
      h("main", { class: "game-shell" }, [
        h("section", { class: "game-stage", ref: gameHost }),
        h("aside", { class: "hud-panel" }, [
          h("div", { class: "hud-title" }, "末日废土幸存者"),
          ...hudLines.value.map((line) => h("div", { class: "hud-line" }, line)),
          h("div", { class: "game-message" }, store.message),
        ]),
      ]);
  },
});
