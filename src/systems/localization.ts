const FIXED_GAME_MESSAGES: Record<string, string> = {
  "Boss Rush scenario started. Choose a final form to fight.": "Boss Rush 已开始。选择最终形态后开战。",
  "Story mode: center beacon online. Explore the entry zone, then light towers.": "剧情模式：中心信标已启动。先探索入口区域，再建立照明网络。",
  "10000x10000 city wasteland started.": "10000x10000 城市废土已展开。",
  "Target is outside fog vision. Attacks only hit visible enemies.": "目标在迷雾视野外：攻击只能命中当前视野内的敌人。",
  "Debug: gained experience. Bosses keep patrolling the map.": "调试：获得经验。Boss 会继续在地图上巡逻。",
  "Mutant Chef: meat grinder started.": "变异厨师：绞肉机启动。",
  "椹吔甯堬細褰诲簳鏆磋蛋": "驯兽师：彻底暴走。",
  "Focused laser: piercing sweep.": "聚焦激光：贯穿扫射。",
  "鎶€鑳借鎶戝埗涓細鐩镐綅闂幇澶辨晥": "技能被压制：相位闪现失效。",
  "Phase blink: escaped by folding space.": "相位闪现：折叠空间逃脱。",
  "Time rewind: returned to a safe position.": "时间回溯：返回安全位置。",
  "Fold mine: deployed behind you.": "折叠地雷：已部署在身后。",
  "Skills are suppressed.": "技能被压制，无法释放。",
  "鎶€鑳借鎶戝埗涓細缁堟瀬鎶€鏃犳硶閲婃斁": "技能被压制：终极技无法释放。",
  "Ultimate form is not online yet.": "终极形态尚未上线。",
  "鎶€鑳借鎶戝埗涓細瓒呯骇澶ф嫑鏃犳硶閲婃斁": "技能被压制：超级大招无法释放。",
  "Endgame ultimate is not unlocked yet.": "终局超级大招尚未解锁。",
  "Endgame phase has not started yet.": "终局阶段尚未开始。",
  "Hospital knight defeated. The ruined hospital falls silent.": "白骨骑士已击败。破败医院归于死寂。",
  "Boss Rush: war core destroyed.": "Boss Rush：战争核心已摧毁。",
  "Mission complete: final Boss defeated.": "任务完成：最终 Boss 已击败。",
  "Kill charge full. Choose one mech upgrade.": "击杀充能已满。选择一项机甲升级。",
  "No roaming Boss exists on the current map.": "当前地图没有游荡 Boss。",
  "War Core breaches the surface and drags you into the underground armory.": "战争核心撕裂地表，将你拖入地下军火库。",
  "War Core destroyed. The underground armory is collapsing. Evacuate now.": "战争核心已摧毁。地下军火库正在塌陷，立刻撤离。",
  "War Core is destroyed, but you were buried in the underground armory.": "战争核心已摧毁，但你被埋在了地下军火库中。",
  "You escaped the underground armory. War Core has been annihilated.": "你逃出了地下军火库。失控战争核心已彻底毁灭。",
  "Hospital knight phase two: bones rise as soldiers.": "白骨骑士二阶段：骸骨化作士兵复苏。",
  "Hospital knight awakened: the ruined hospital is hostile.": "白骨骑士苏醒：破败医院进入敌对状态。",
  "Bone Knight: skeleton command.": "白骨骑士：骸骨号令。",
  "Bone Knight: royal guard.": "白骨骑士：王卫召集。",
  "Bone Knight: dead formation.": "白骨骑士：亡者阵列。",
  "Hospital knight casts Giant Sword Shackle.": "白骨骑士释放巨剑枷锁。",
  "Giant Sword Shackle: player trapped for 3 seconds.": "巨剑枷锁：玩家被禁锢 3 秒。",
  "Bone Knight: holy lance charge.": "白骨骑士：圣枪冲锋。",
  "Magic box blast: player took heavy damage.": "魔盒爆炸：玩家受到重伤。",
  "Magic box freeze: player cannot move.": "魔盒冻结：玩家暂时无法移动。",
  "Magic box illusion: player vision narrowed.": "魔盒幻象：玩家视野缩小。",
  "Magician curtain call: ": "魔术师谢幕：",
  "Center lighthouse lit: vision expanded and nearby monster pressure rises.": "中心灯塔已点亮：视野扩大，附近怪物压力上升。",
  "No searchable point nearby.": "附近没有可搜索点。",
};

export function localizeGameMessage(message: string): string {
  const fixed = FIXED_GAME_MESSAGES[message];
  if (fixed) return fixed;

  let match = message.match(/^Attack mode: (auto|manual)$/);
  if (match) return `普攻模式：${match[1] === "auto" ? "自动" : "手动"}`;

  match = message.match(/^Skill slot (\d+) is empty\.$/);
  if (match) return `技能栏 ${match[1]} 为空。`;

  match = message.match(/^Cast skill slot (\d+): fan bullet wave\.$/);
  if (match) return `释放技能栏 ${match[1]}：扇形弹幕。`;

  match = message.match(/^(.+): projectile fired\.$/);
  if (match) return `${match[1]}：投射物已发射。`;

  match = message.match(/^(.+): orbital calibration\.$/);
  if (match) return `${match[1]}：轨道校准完成。`;

  match = message.match(/^(.+): target locked\.$/);
  if (match) return `${match[1]}：目标锁定。`;

  match = message.match(/^(.+): swarm launched\.$/);
  if (match) return `${match[1]}：弹群发射。`;

  match = message.match(/^(.+): missile launched\.$/);
  if (match) return `${match[1]}：导弹发射。`;

  match = message.match(/^(.+): orbital laser matrix locked\.$/);
  if (match) return `${match[1]}：轨道激光矩阵锁定。`;

  match = message.match(/^(.+): missile bay opened, area saturation incoming\.$/);
  if (match) return `${match[1]}：导弹舱开启，区域饱和打击即将到来。`;

  match = message.match(/^(.+): heated blade crosses the battlefield\.$/);
  if (match) return `${match[1]}：热能刃横扫战场。`;

  match = message.match(/^(.+): sky beams pierce the battlefield\.$/);
  if (match) return `${match[1]}：天基光束贯穿战场。`;

  match = message.match(/^(.+): nuclear coordinates confirmed\.$/);
  if (match) return `${match[1]}：核打击坐标已确认。`;

  match = message.match(/^(.+): assault armor deployed for close suppression\.$/);
  if (match) return `${match[1]}：突击装甲部署，开始近距压制。`;

  match = message.match(/^Boss defeated: (.+)$/);
  if (match) return `Boss 已击败：${match[1]}`;

  match = message.match(/^Upgrade selected: (.+)$/);
  if (match) return `升级已选择：${match[1]}`;

  match = message.match(/^Final form: (.+), ultimate (.+)$/);
  if (match) return `最终形态：${match[1]}，终极技：${match[2]}`;

  match = message.match(/^Nearest Boss: (.+), mode (roaming|chasing)\.$/);
  if (match) return `最近 Boss：${match[1]}，状态：${match[2] === "roaming" ? "巡逻" : "追击"}。`;

  match = message.match(/^(.+) has landed\. Endgame phase started\. Press T for super ultimate\.$/);
  if (match) return `${match[1]}已降临。终局阶段开始，按 T 释放超级大招。`;

  match = message.match(/^(.+) 杩涘叆 P(\d+)$/);
  if (match) return `${match[1]}进入 P${match[2]}。`;

  match = message.match(/^Armory collapsing: (\d+)s left\.$/);
  if (match) return `军火库塌陷中：剩余 ${match[1]} 秒。`;

  match = message.match(/^(.+): interference wave deployed, red lasers locking\.$/);
  if (match) return `${match[1]}：干扰波已释放，红色激光正在锁定。`;

  match = message.match(/^(.+): bombardment zones marked\.$/);
  if (match) return `${match[1]}：轰炸区域已标记。`;

  match = message.match(/^(.+): citywide wanted order, hunters taking rooftops\.$/);
  if (match) return `${match[1]}：全城通缉令发布，猎杀单位占领楼顶。`;

  match = message.match(/^(.+): building control strike\.$/);
  if (match) return `${match[1]}：建筑控制打击。`;

  match = message.match(/^(.+): orange city beam\.$/);
  if (match) return `${match[1]}：橙色城市光束。`;

  match = message.match(/^(.+): back missiles locked\.$/);
  if (match) return `${match[1]}：背部导弹锁定。`;

  match = message.match(/^(.+): suppression crawlers released\.$/);
  if (match) return `${match[1]}：压制爬行雷已释放。`;

  match = message.match(/^(.+): final annihilation beam\.$/);
  if (match) return `${match[1]}：最终歼灭光束。`;

  match = message.match(/^Boss Rush: (.+)$/);
  if (match) return `Boss Rush：${match[1]}`;

  match = message.match(/^(.+) starts a charge\.$/);
  if (match) return `${match[1]}开始冲锋。`;

  match = message.match(/^(.+) releases a ring barrage\.$/);
  if (match) return `${match[1]}释放环形弹幕。`;

  match = message.match(/^(.+) throws explosive parcels\.$/);
  if (match) return `${match[1]}投掷爆炸包裹。`;

  match = message.match(/^(.+) releases knife gala\.$/);
  if (match) return `${match[1]}释放华丽飞刀。`;

  match = message.match(/^Magician curtain call: (\d+) seconds\.$/);
  if (match) return `魔术师谢幕：${match[1]} 秒。`;

  match = message.match(/^(.+): (.+)$/);
  if (match) return `${match[1]}：${match[2]}`;

  match = message.match(/^Search: (.+)$/);
  if (match) return `搜索：${match[1]}`;

  match = message.match(/^鐩镐綅闂幇鍐峰嵈涓細(\d+)s$/);
  if (match) return `相位闪现冷却中：${match[1]} 秒`;

  match = message.match(/^缁堟瀬鎶€鍐峰嵈涓細(\d+)s$/);
  if (match) return `终极技冷却中：${match[1]} 秒`;

  match = message.match(/^瓒呯骇澶ф嫑鍐峰嵈涓細(\d+)s$/);
  if (match) return `超级大招冷却中：${match[1]} 秒`;

  return message;
}
