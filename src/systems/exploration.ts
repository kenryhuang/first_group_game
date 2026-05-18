import type { ExplorationRewards, ExplorationState, MapNode } from "../domain/types";

const emptyRewards: ExplorationRewards = {
  experience: 0,
  healing: 0,
  skillIds: [],
  passiveFragmentIds: [],
  clueBossIds: [],
  temporaryPollution: 0,
};

const nodes: MapNode[] = [
  {
    id: "street-fridge",
    name: "血肉冰箱",
    kind: "resource",
    bossId: "chef",
    x: 220,
    y: 180,
    rewards: { ...emptyRewards, experience: 20, passiveFragmentIds: ["greasy-edge"], clueBossIds: ["chef"] },
  },
  {
    id: "greasy-kitchen",
    name: "油污厨房",
    kind: "influence",
    bossId: "chef",
    x: 340,
    y: 260,
    rewards: { ...emptyRewards, experience: 30, skillIds: ["oil-flame"], clueBossIds: ["chef"], temporaryPollution: 4 },
  },
  {
    id: "stage-crate",
    name: "舞台箱",
    kind: "resource",
    bossId: "clown",
    x: 820,
    y: 190,
    rewards: { ...emptyRewards, experience: 25, skillIds: ["balloon-barrage"], clueBossIds: ["clown"] },
  },
  {
    id: "laughing-crowd",
    name: "笑脸观众",
    kind: "event",
    bossId: "clown",
    x: 940,
    y: 270,
    rewards: { ...emptyRewards, experience: 40, passiveFragmentIds: ["delayed-laugh"], clueBossIds: ["clown"], temporaryPollution: 5 },
  },
  {
    id: "blood-waybill",
    name: "染血配送单",
    kind: "event",
    bossId: "courier",
    x: 760,
    y: 530,
    rewards: { ...emptyRewards, experience: 35, skillIds: ["explosive-parcel"], clueBossIds: ["courier"] },
  },
  {
    id: "courier-locker",
    name: "快递柜",
    kind: "influence",
    bossId: "courier",
    x: 960,
    y: 560,
    rewards: { ...emptyRewards, experience: 35, passiveFragmentIds: ["express-route"], clueBossIds: ["courier"], temporaryPollution: 6 },
  },
  {
    id: "safe-cache",
    name: "药柜",
    kind: "resource",
    bossId: null,
    x: 560,
    y: 400,
    rewards: { ...emptyRewards, healing: 25, experience: 15 },
  },
];

export function createExplorationState(): ExplorationState {
  return {
    nodes,
    resolvedNodeIds: [],
    discoveredBossClues: [],
  };
}

export function resolveMapNode(state: ExplorationState, nodeId: string): {
  nextState: ExplorationState;
  rewards: ExplorationRewards;
} {
  if (state.resolvedNodeIds.includes(nodeId)) {
    return { nextState: state, rewards: emptyRewards };
  }

  const node = state.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return { nextState: state, rewards: emptyRewards };
  }

  const discoveredBossClues = Array.from(
    new Set([...state.discoveredBossClues, ...node.rewards.clueBossIds]),
  );

  return {
    nextState: {
      ...state,
      resolvedNodeIds: [...state.resolvedNodeIds, nodeId],
      discoveredBossClues,
    },
    rewards: node.rewards,
  };
}
