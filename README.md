# First Group Game

末日废土幸存者肉鸽游戏设计项目。

## 游戏概念

玩家每局以普通幸存者身份开局，在开放废土城市地图中探索、战斗、搜索，并通过职业碎片拼装主动技能与被动能力。

游戏核心结构是：

- 开放探索与资源搜索。
- 职业碎片拼装构筑。
- 常规 Boss 在城市中游荡，玩家可以主动寻找或被迫遭遇。
- 污染带来的高风险高收益成长。
- 100 级最终 Boss：异化的自己。

## 核心特色

- 地图尺寸为 `10000x10000`。
- 变异厨师、变异小丑、变异快递员开局全部在地图中游荡，最终 Boss 不在原型阶段出现。
- Boss 默认巡游，玩家靠近后追击，并带有可见技能：冲锋、环形弹幕、爆炸包。
- 普攻可自动或手动切换，并以可见子弹形式飞行。
- 主动技能全部手动释放，最多携带 4 个。
- 城市废土里有楼房阻挡，玩家、怪物、Boss 和子弹都不能穿过。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、PixiJS、Pinia、Howler.js、GSAP。
- 后端：Node.js、Express。数据库预留 PostgreSQL/MySQL，排行榜和缓存预留 Redis，实时同步预留 WebSocket。

## 设计文档

详细设计文档位于：

`docs/superpowers/specs/2026-05-17-wasteland-survivor-roguelite-design.md`

## 本地运行

安装依赖：

```bash
npm install
```

启动原型：

```bash
npm run dev
```

启动后端骨架：

```bash
npm run server:dev
```

验证：

```bash
npm test
npm run build
npm run e2e
```

原型操作：

- `WASD` 或方向键移动。
- `E` 搜索附近资源点或事件点。
- `Q` 切换自动/手动普攻。
- `Space` 向鼠标方向发射手动普攻子弹。
- `1` 到 `4` 释放主动技能弹幕。
- `X` 模拟获得经验。
- `B` 标记最近的游荡 Boss，不会额外召唤 Boss。
