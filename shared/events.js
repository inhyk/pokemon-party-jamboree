export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Room
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_ERROR: 'room:error',

  // Character Select
  SELECT_CHARACTER: 'character:select',
  CHARACTER_UPDATE: 'character:update',
  ALL_READY: 'character:allReady',

  // Game Flow
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_END: 'game:end',
  GAME_ERROR: 'game:error',

  // Turn
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  REQUEST_DICE: 'turn:requestDice',
  DICE_RESULT: 'turn:diceResult',
  PLAYER_MOVE: 'turn:playerMove',
  MOVE_COMPLETE: 'turn:moveComplete',
  JUNCTION_CHOICE: 'turn:junctionChoice',
  JUNCTION_PROMPT: 'turn:junctionPrompt',
  TILE_EFFECT: 'turn:tileEffect',

  // Star
  STAR_PROMPT: 'star:prompt',
  STAR_RESPONSE: 'star:response',
  STAR_PURCHASED: 'star:purchased',
  STAR_MOVED: 'star:moved',

  // Items
  USE_ITEM: 'item:use',
  ITEM_EFFECT: 'item:effect',
  ITEM_ACQUIRED: 'item:acquired',
  ITEM_TARGET_PROMPT: 'item:targetPrompt',
  ITEM_TARGET_RESPONSE: 'item:targetResponse',

  // Shop
  SHOP_ENTER: 'shop:enter',
  SHOP_BUY: 'shop:buy',
  SHOP_LEAVE: 'shop:leave',
  SHOP_RESULT: 'shop:result',

  // Events
  EVENT_TRIGGER: 'event:trigger',
  EVENT_RESULT: 'event:result',

  // Minigame
  MINIGAME_ANNOUNCE: 'minigame:announce',
  MINIGAME_START: 'minigame:start',
  MINIGAME_INPUT: 'minigame:input',
  MINIGAME_UPDATE: 'minigame:update',
  MINIGAME_END: 'minigame:end',
  MINIGAME_RESULT: 'minigame:result',

  // Results
  BONUS_STARS: 'result:bonusStars',
  FINAL_RESULTS: 'result:final',

  // Reconnection
  RECONNECT: 'reconnect',
  RECONNECT_STATE: 'reconnect:state',
};
