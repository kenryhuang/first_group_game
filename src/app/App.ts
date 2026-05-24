import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref } from "vue";
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

    const destroyGame = (): void => {
      game?.destroy();
      game = undefined;
    };

    const startPixiGame = async (): Promise<void> => {
      if (!gameHost.value) return;
      destroyGame();
      game = new PixiWastelandGame(gameHost.value, {
        onMetrics: (metrics) => store.syncMetrics(metrics),
        onMessage: (message) => {
          store.setMessage(message);
          gsap.fromTo(".game-message", { opacity: 0.45, y: 6 }, { opacity: 1, y: 0 });
        },
        onRunState: (runState) => store.syncRunState(runState),
        onGameOver: (runState) => {
          store.syncRunState(runState);
          store.finishGame();
        },
        onMissionSuccess: (runState) => {
          store.syncRunState(runState);
          store.completeMission();
        },
      });
      await game.start();
    };

    const startGame = async (): Promise<void> => {
      store.startGame();
      await nextTick();
      await startPixiGame();
    };

    const restartGame = async (): Promise<void> => {
      destroyGame();
      store.startGame();
      await nextTick();
      await startPixiGame();
    };

    onBeforeUnmount(() => {
      destroyGame();
    });

    const renderMenu = () =>
      h("section", { class: "screen-panel start-panel" }, [
        h("div", { class: "screen-kicker" }, "城市废土 / 机甲投放"),
        h("h1", { class: "screen-title" }, "末日废土幸存者"),
        h("p", { class: "screen-copy" }, "驾驶高科技机甲进入 10000x10000 城市废土，清理丧尸、入侵 Boss 领地，并活到最后。"),
        h("button", { class: "primary-action", type: "button", onClick: startGame }, "开始游戏"),
      ]);

    const renderGameOver = () =>
      h("section", { class: "screen-panel game-over-panel" }, [
        h("div", { class: "screen-kicker danger" }, "信号丢失"),
        h("h1", { class: "screen-title" }, "任务失败"),
        h("p", { class: "screen-copy" }, `等级 ${store.runState.level}  击杀 Boss ${store.runState.killedBossIds.length}/3  HP 0/${store.runState.maxHealth}`),
        h("button", { class: "primary-action", type: "button", onClick: restartGame }, "重新开始"),
      ]);

    const renderMissionSuccess = () =>
      h("section", { class: "screen-panel mission-success-panel" }, [
        h("div", { class: "screen-kicker success" }, "核心摧毁"),
        h("h1", { class: "screen-title" }, "任务成功"),
        h("p", { class: "screen-copy" }, `失控战争核心已摧毁。等级 ${store.runState.level}  HP ${store.runState.health}/${store.runState.maxHealth}`),
        h("button", { class: "primary-action", type: "button", onClick: restartGame }, "再次挑战"),
      ]);

    return () =>
      h("main", { class: "game-shell" }, [
        store.phase !== "menu" ? h("section", { class: "game-stage", ref: gameHost }) : null,
        store.phase === "menu" ? renderMenu() : null,
        store.phase === "gameOver" ? renderGameOver() : null,
        store.phase === "missionSuccess" ? renderMissionSuccess() : null,
        store.phase !== "menu"
          ? h("aside", { class: "hud-panel" }, [
              h("div", { class: "hud-title" }, "末日废土幸存者"),
              ...hudLines.value.map((line) => h("div", { class: "hud-line" }, line)),
              h("div", { class: "game-message" }, store.message),
            ])
          : null,
      ]);
  },
});
