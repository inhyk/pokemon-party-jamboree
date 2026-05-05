export const GAME = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  DEFAULT_TURNS: 10,
  BOARD_SIZE: 30,
  STARTING_COINS: 10,
  STAR_COST: 20,
  DICE_MIN: 1,
  DICE_MAX: 10,
};

export const TILE_TYPES = {
  BLUE: 'blue',
  RED: 'red',
  EVENT: 'event',
  ITEM: 'item',
  SHOP: 'shop',
  STAR: 'star',
  BOWSER: 'bowser',
  START: 'start',
  JUNCTION: 'junction',
};

export const TILE_EFFECTS = {
  [TILE_TYPES.BLUE]: 3,
  [TILE_TYPES.RED]: -3,
  [TILE_TYPES.BOWSER]: -10,
};

export const CHARACTERS = {
  PIKACHU: { id: 'pikachu', name: '피카츄', color: 0xf8d030 },
  BULBASAUR: { id: 'bulbasaur', name: '이상해씨', color: 0x78c850 },
  CHARMANDER: { id: 'charmander', name: '파이리', color: 0xf08030 },
  SQUIRTLE: { id: 'squirtle', name: '꼬부기', color: 0x6890f0 },
  SNORLAX: { id: 'snorlax', name: '잠만보', color: 0x7e6e5a },
  MEW: { id: 'mew', name: '뮤', color: 0xf85888 },
};

export const ITEMS = {
  MUSHROOM: { id: 'mushroom', name: '버섯', cost: 5, desc: '주사위 2개 굴리기' },
  DOUBLE_DICE: { id: 'double_dice', name: '더블다이스', cost: 5, desc: '주사위 2개 합산' },
  WARP_PIPE: { id: 'warp_pipe', name: '워프파이프', cost: 10, desc: '다른 플레이어와 위치 교환' },
  COIN_THIEF: { id: 'coin_thief', name: '코인도둑', cost: 15, desc: '다른 플레이어에게서 10코인 빼앗기' },
  MASTER_BALL: { id: 'master_ball', name: '마스터볼', cost: 25, desc: '스타 칸으로 직행' },
};

export const EVENTS = {
  COIN_GIFT: 'coin_gift',
  COIN_PLUNDER: 'coin_plunder',
  STAR_SHUFFLE: 'star_shuffle',
  POSITION_SWAP: 'position_swap',
  ROCKET_RAID: 'rocket_raid',
  LUCKY_ROULETTE: 'lucky_roulette',
};

export const GAME_PHASES = {
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  BOARD_GAME: 'BOARD_GAME',
  GAME_END: 'GAME_END',
};

export const TURN_PHASES = {
  TURN_START: 'TURN_START',
  DICE_ROLL: 'DICE_ROLL',
  PLAYER_MOVE: 'PLAYER_MOVE',
  TILE_EFFECT: 'TILE_EFFECT',
  TURN_END: 'TURN_END',
  MINIGAME_SELECT: 'MINIGAME_SELECT',
  MINIGAME_PLAY: 'MINIGAME_PLAY',
  MINIGAME_RESULT: 'MINIGAME_RESULT',
};

export const MINIGAME_TYPES = {
  COIN_DASH: 'coin_dash',
  BUMPER_BATTLE: 'bumper_battle',
  MEMORY_MATCH: 'memory_match',
  PLATFORM_RACE: 'platform_race',
  VOLLEY_BOUNCE: 'volley_bounce',
};
