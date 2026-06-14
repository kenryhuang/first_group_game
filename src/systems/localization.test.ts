import { describe, expect, it } from "vitest";
import { localizeGameMessage } from "./localization";

describe("game message localization", () => {
  it("localizes fixed English gameplay subtitles to Chinese", () => {
    expect(localizeGameMessage("War Core destroyed. The underground armory is collapsing. Evacuate now.")).toBe(
      "战争核心已摧毁。地下军火库正在塌陷，立刻撤离。",
    );
    expect(localizeGameMessage("Skills are suppressed.")).toBe("技能被压制，无法释放。");
  });

  it("localizes common dynamic gameplay subtitle patterns", () => {
    expect(localizeGameMessage("Armory collapsing: 12s left.")).toBe("军火库塌陷中：剩余 12 秒。");
    expect(localizeGameMessage("Boss defeated: 变异厨师")).toBe("Boss 已击败：变异厨师");
    expect(localizeGameMessage("Nearest Boss: 魔术师, mode chasing.")).toBe("最近 Boss：魔术师，状态：追击。");
    expect(localizeGameMessage("Skill slot 2 is empty.")).toBe("技能栏 2 为空。");
  });

  it("passes through existing Chinese subtitles", () => {
    expect(localizeGameMessage("终幕剧场：三幕演出开始。")).toBe("终幕剧场：三幕演出开始。");
  });
});
