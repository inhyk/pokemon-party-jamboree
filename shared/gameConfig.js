export const CONFIG = {
  server: {
    port: 3000,
    tickRate: 20,
  },
  board: {
    tileSize: 64,
    moveSpeed: 200,
    animDuration: 300,
  },
  minigame: {
    transitionTime: 3000,
    defaultDuration: 30000,
    maxDuration: 60000,
    coinReward: { first: 10, second: 6, third: 3, fourth: 1 },
  },
  dice: {
    animDuration: 1500,
    bounceCount: 8,
  },
  shop: {
    maxItems: 3,
  },
  bonusStars: {
    MINI_GAME_STAR: { id: 'minigame_star', name: '미니게임 스타', desc: '미니게임 최다 승리' },
    COIN_STAR: { id: 'coin_star', name: '코인 스타', desc: '총 코인 최다 획득' },
    EVENT_STAR: { id: 'event_star', name: '이벤트 스타', desc: '이벤트 칸 최다 착지' },
  },
};
