import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref } from "vue";
import { gsap } from "gsap";
import { useGameStore, STORY_MECH_LABELS, type StoryMechId } from "./gameStore";
import { PixiWastelandGame } from "../game/PixiWastelandGame";
import { BOSS_RUSH_SCENARIOS, type BossRushScenarioId } from "../systems/bossRush";

const STORY_MECHS: Array<{ id: StoryMechId; description: string }> = [
  { id: "vanguard", description: "装甲更厚，适合第一阶段顶着雾中尸潮点亮灯塔。" },
  { id: "medic", description: "拥有污染抑制和续航倾向，后续适合血清与同伴线。" },
  { id: "engineer", description: "强化灯塔、扫描和城市设施互动，后续适合探索线。" },
];

export default defineComponent({
  name: "WastelandPrototypeApp",
  setup() {
    const gameHost = ref<HTMLDivElement | null>(null);
    const store = useGameStore();
    let game: PixiWastelandGame | undefined;

    const hudLines = computed(() => store.hudLines);
    const showGameStage = computed(() => ["playing", "gameOver", "missionSuccess"].includes(store.phase));
    const showHud = computed(() => store.phase !== "menu" && store.phase !== "storyIntro" && store.phase !== "storyMechSelect");

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
      }, {
        mode: store.mode,
        bossRushScenarioId: store.bossRushScenarioId ?? undefined,
        storyMechId: store.selectedStoryMechId ?? undefined,
      });
      await game.start();
    };

    const startGame = async (): Promise<void> => {
      store.startGame();
      await nextTick();
      await startPixiGame();
    };

    const openStoryIntro = (): void => {
      destroyGame();
      store.openStoryIntro();
    };

    const startStoryMode = async (mechId: StoryMechId): Promise<void> => {
      store.startStoryMode(mechId);
      await nextTick();
      await startPixiGame();
    };

    const restartGame = async (): Promise<void> => {
      destroyGame();
      if (store.mode === "bossRush" && store.bossRushScenarioId) {
        store.startBossRush(store.bossRushScenarioId);
      } else if (store.mode === "story") {
        store.startStoryMode(store.selectedStoryMechId ?? "vanguard");
      } else {
        store.startGame();
      }
      await nextTick();
      await startPixiGame();
    };

    const openBossRushSelect = (): void => {
      destroyGame();
      store.openBossRushSelect();
    };

    const returnToMenuFromGame = (): void => {
      destroyGame();
      store.returnToMenu();
    };

    const startBossRush = async (scenarioId: BossRushScenarioId): Promise<void> => {
      store.startBossRush(scenarioId);
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
        h("p", { class: "screen-copy" }, "选择作战模式，驾驶高科技机甲进入城市废土。"),
        h("div", { class: "mode-grid" }, [
          h("button", { class: "mode-card available", type: "button", "data-testid": "classic-mode-button", "aria-label": "经典模式", onClick: startGame }, [
            h("span", { class: "mode-title" }, "经典"),
            h("span", { class: "mode-copy" }, "保留原本玩法：标准成长流程，探索城市、清理尸潮、挑战游荡 Boss。"),
          ]),
          h("button", { class: "mode-card available", type: "button", "data-testid": "story-mode-button", "aria-label": "剧情模式", onClick: openStoryIntro }, [
            h("span", { class: "mode-title" }, "剧情模式"),
            h("span", { class: "mode-copy" }, "进入雾城调查“祝福”源头，点亮灯塔、寻找同伴、推进主线。"),
          ]),
          h("button", { class: "mode-card available", type: "button", "data-testid": "boss-rush-button", "aria-label": "Boss Rush", onClick: openBossRushSelect }, [
            h("span", { class: "mode-title" }, "Boss Rush"),
            h("span", { class: "mode-copy" }, "选择单个 Boss 单挑，满级机甲直接开战。"),
          ]),
          h("button", { class: "mode-card locked", type: "button", "data-testid": "coop-mode-button", "aria-label": "联机 未开放", disabled: true }, [
            h("span", { class: "mode-title" }, "联机"),
            h("span", { class: "mode-copy" }, "未开放"),
          ]),
        ]),
      ]);

    const renderStoryIntro = () =>
      h("section", { class: "screen-panel story-panel", "data-testid": "story-intro" }, [
        h("div", { class: "screen-kicker" }, "剧情模式 / 任务简报"),
        h("h1", { class: "screen-title" }, "雾城调查任务"),
        h("p", { class: "screen-copy" }, "幸存者组织派遣你和同伴进入最初爆发的城市。整座城市被气化“祝福”覆盖，视野被压缩到屏幕附近，只有点亮灯塔才能短暂扩大安全观察范围。"),
        h("p", { class: "screen-copy compact" }, "第一阶段目标：进入城市中心，按 E 点亮中心灯塔，观察迷雾视野和怪物压力变化。"),
        h("div", { class: "action-row" }, [
          h("button", { class: "secondary-action", type: "button", onClick: () => store.returnToMenu() }, "返回"),
          h("button", { class: "primary-action", type: "button", "data-testid": "story-intro-continue", onClick: () => store.openStoryMechSelect() }, "选择机甲"),
        ]),
      ]);

    const renderStoryMechSelect = () =>
      h("section", { class: "screen-panel story-panel", "data-testid": "story-mech-select" }, [
        h("div", { class: "screen-kicker" }, "剧情模式 / 机甲选择"),
        h("h1", { class: "screen-title" }, "选择入城机甲"),
        h("p", { class: "screen-copy" }, "第一版先记录机甲类型并进入雾城，后续会接入不同技能、污染抗性和同伴互动。"),
        h("div", { class: "mode-grid story-mech-grid" }, STORY_MECHS.map((mech) =>
          h("button", { class: "mode-card available", type: "button", "data-testid": `story-mech-${mech.id}`, onClick: () => startStoryMode(mech.id) }, [
            h("span", { class: "mode-title" }, STORY_MECH_LABELS[mech.id]),
            h("span", { class: "mode-copy" }, mech.description),
          ]),
        )),
        h("button", { class: "secondary-action", type: "button", onClick: () => store.openStoryIntro() }, "返回简报"),
      ]);

    const renderBossRushSelect = () =>
      h("section", { class: "screen-panel start-panel" }, [
        h("div", { class: "screen-kicker" }, "Boss Rush / 副本选择"),
        h("h1", { class: "screen-title" }, "Boss Rush"),
        h("p", { class: "screen-copy" }, "先选择单 Boss 单挑；战争核心额外提供 P1-P4 阶段演示，多人挑战副本保留在列表后段。Boss Rush 会按 Boss 强度设置玩家等级，普通小怪不自然刷新。"),
        h("div", { class: "scenario-grid" }, [
          ...BOSS_RUSH_SCENARIOS.map((scenario) =>
            h("button", { class: "scenario-card", type: "button", "aria-label": scenario.name, onClick: () => startBossRush(scenario.id) }, [
              h("span", { class: "mode-title" }, scenario.name),
              h("span", { class: "mode-copy" }, scenario.description),
            ]),
          ),
        ]),
        h("button", { class: "secondary-action", type: "button", onClick: () => store.returnToMenu() }, "返回模式选择"),
      ]);

    const renderGameOver = () =>
      h("section", { class: "screen-panel game-over-panel" }, [
        h("div", { class: "screen-kicker danger" }, "信号丢失"),
        h("h1", { class: "screen-title" }, "任务失败"),
        h("p", { class: "screen-copy" }, `等级 ${store.runState.level}  击杀 Boss ${store.runState.killedBossIds.length}/3  生命 0/${store.runState.maxHealth}`),
        h("button", { class: "primary-action", type: "button", onClick: restartGame }, "重新开始"),
      ]);

    const renderMissionSuccess = () =>
      h("section", { class: "screen-panel mission-success-panel" }, [
        h("div", { class: "screen-kicker success" }, "核心摧毁"),
        h("h1", { class: "screen-title" }, "任务成功"),
        h("p", { class: "screen-copy" }, `失控战争核心已摧毁。等级 ${store.runState.level}  生命 ${store.runState.health}/${store.runState.maxHealth}`),
        h("button", { class: "primary-action", type: "button", onClick: restartGame }, "再次挑战"),
      ]);

    return () =>
      h("main", { class: "game-shell" }, [
        showGameStage.value ? h("section", { class: "game-stage", ref: gameHost }) : null,
        store.phase === "menu" ? renderMenu() : null,
        store.phase === "storyIntro" ? renderStoryIntro() : null,
        store.phase === "storyMechSelect" ? renderStoryMechSelect() : null,
        store.phase === "bossRushSelect" ? renderBossRushSelect() : null,
        store.phase === "gameOver" ? renderGameOver() : null,
        store.phase === "missionSuccess" ? renderMissionSuccess() : null,
        showHud.value
          ? h("aside", { class: "hud-panel" }, [
              h("div", { class: "hud-title" }, "末日废土幸存者"),
              ...hudLines.value.map((line) => h("div", { class: "hud-line" }, line)),
              h("div", { class: "game-message" }, store.message),
              h("button", { class: "secondary-action hud-return-action", type: "button", "data-testid": "return-menu-button", onClick: returnToMenuFromGame }, "返回主界面"),
            ])
          : null,
      ]);
  },
});
