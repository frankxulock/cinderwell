/* 烬井界面语言。简体是原文，繁体和英文按同一句中文来替换。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CinderwellI18n = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var ORDER = ['zh-CN', 'zh-Hant', 'en'];
  var UI = {
    'zh-CN': {
      title: '烬井',
      langName: '简体',
      pause: '暂停',
      dash: '冲',
      flare: '焰弹',
      continueRun: '继续下井',
      start: '开始下井',
      startTeach: '开始教学局',
      invite: '邀请好友',
      shop: '灯塔商店',
      growth: '新星里程碑',
      help: '怎么操作',
      growthTitle: '新星里程碑',
      growthLead: '进来就有基础进度。做完剩下的任务，领取早期测试者星标。',
      squadLabel: '常待的公开群',
      inviteBtn: '邀请好友',
      channel: '打开官方频道',
      claim: '领取星标',
      joinSquad: '加入这个群的公会',
      back: '返回',
      rallyTitle: '应援号召',
      rallySend: '发给群友',
      rallyLater: '先继续',
      shopTitle: '灯塔商店',
      helpTitle: '怎么操作',
      pauseTitle: '灯火暂歇',
      resume: '继续',
      quit: '回灯塔',
      reviveTitle: '灯快灭了',
      reviveLead: '看完一段广告，灯油加满，原地再来。每局一次。没看完就没有奖励。',
      reviveBtn: '看广告复活',
      giveUp: '就到这里',
      endDead: '灯灭了',
      endWin: '出井了',
      doubleBtn: '看广告灰烬翻倍',
      again: '再下一局',
      endInvite: '邀请好友，领星标',
      endMenu: '回灯塔',
      leadTeach: '第一局会教你走、瞄准和冲刺。前两层按灯油和战绩放轻，打顺了再加紧。',
      leadEasy: '前两层仍按灯油和战绩调整。连着倒下会放轻，打得顺就加紧。',
      leadHard: '井没有底。每三层换一种窑主，越往下血越厚。',
      best: '最高 {n}',
      ash: '灰烬 {n}',
      milestone: '新星里程碑 {now}/{goal}',
      milestoneBadge: '新星里程碑 {now}/{goal} · 星标已领',
      pointsBadge: '{now} / {goal} · 星标已领',
      floorLabel: '{name} · 第 {n} 层',
      res: '烬 {cinders}   火印 {seals}   焰弹 {flares}',
      chainN: '连 {n}',
      pauseIdle: '这一局还在。',
      pauseLine: '{floor} · 灯油 {hp}/{max} · 烬 {cinders}。{gear}。',
      noGear: '还没有道具',
      endWinText: '窑主熄了，你走出{where}。得分 {score}，身上还有烬 {held}，带回灰烬 {gained}。',
      endDeadText: '灯油烧尽，停在{where}。得分 {score}，身上还有烬 {held}，带回灰烬 {gained}。',
      doubled: ' 翻倍后再得 {n}。',
      adEmpty: '广告位还没填，看完真广告才会发奖励。',
      adPlaying: '广告播放中',
      adSkip: '没看完，这次没有奖励。',
      adFail: '广告没播成，这次没有奖励。',
      teachToast: '教学局',
      floorOne: '第 1 层',
      bossDown: '{name}熄了',
      salePrice: '特价 {n} 烬',
      price: '{n} 烬',
      shopBuy: '{n} 灰烬',
      shopMax: '满了',
      shopAsh: '灰烬 {n}',
      cursorDone: '冥想完成。灰烬 +500。下一局芯火得到 AI 强化。',
      cursorAlready: '冥想已经完成。奖励不会再发一次。',
      copied: '邀请链接已复制，贴到聊天里即可。',
      taskBase: '基础进度已计入',
      taskShared: '邀请已经发出',
      taskShare: '发出一次邀请',
      taskFriend: '已有好友从链接进来',
      taskNeedFriend: '一位好友从你的链接进来',
      taskPremium: 'Premium 好友已加成',
      taskNeedPremium: 'Premium 好友会再加一截',
      taskChannelOn: '已打开官方频道',
      taskChannel: '打开官方频道',
      cursorDoneBtn: '🔮 AI 冥想已完成',
      noSquad: '还没有公会积分',
      squadRow: '{rank}. @{slug} {score}',
      forged: '这不是 Telegram 里的真实身份，星标不发。',
      claimed: '星标已领。下一局多一发焰弹，灰烬 +12。',
      squadNeed: '请填公开群用户名，例如 @Cinderwell。',
      squadJoined: '已加入 @{name}。积分按你的最高分计入，不会扣别人的分。',
      rally: '📣 应援号召：我们【{mine}】在全服排行榜上的名次正在受到挑战！快叫你的群友一起上线打榜。',
      rallyRival: '📣 应援号召：我们【{mine}】在全服排行榜上的名次正在受到挑战！隔壁【{rival}】就在前面。快叫你的群友一起上线打榜。',
      shareTitle: '🔥 听说过全 AI 写的肉鸽游戏吗？',
      shareText: '我正在玩《烬井》，这款没有底的硬核射击游戏竟然是 100% 用 Cursor AI 写出来的！',
      shareCta: '点击链接直接在 Telegram 里开玩：{url}\n快来加入我的群组公会，一起下井打榜！',
      help1: '第一局会按顺序教：移动、瞄准、冲刺、捡烬、焰弹。提示出现在画面下方。',
      help2: '前两层看你的战绩和当下灯油。连着倒在井口会放轻；灯油见底，下一间也会放轻。打得顺，房间会再加紧。',
      help3: '左边移动，右边瞄准。瞄准时会自己喷出火花。',
      help4: '电脑用 WASD 移动，Shift 或 K 冲刺，鼠标或方向键瞄准射击，空格放焰弹。',
      help5: '打中会跳数字。暴击停一下，灯桶被打炸开会伤周围。',
      help6: '每间战斗房规矩不同：虫巢、脆窑、矿脉、单挑、余潮。带圈的是精英。',
      help7: '灯蛾会绕圈再扑，钟壳会敲出一圈火星。井约会改变这一层的捡取、回血或伤害。',
      help8: '焰弹伤这一间的敌人，并清掉飞过来的火星。',
      help9: '灯台上有一枚火印，用来开库房。货摊上的东西用烬买。',
      help10: '第二层起地上有烫人的裂隙，越深越多。灰傀会先缩一下，再冲过来。',
      help11: '井没有底。窑主、钟匠、蛾后、烬王每三层轮一次，越深血越厚，身边的怪也更多。',
      help12: '怪物潮要连清几波。福利房随便拿，两把武器里选一把：芯火、烬矛、扇烬、回灯。',
      help13: '天赋只能选一个。赌桌踩上去，有赢有输。',
      help14: '新星里程碑用邀请和分享换游戏内积分。领到的是星标徽章，多一发开局焰弹，不能提现。',
      help15: '试炼更难，清完必有道具。灯龛的两件东西只能拿一件。',
      help16: '火花能打掉飞来的火星。短时间连杀会掉连烬。灰壳死时会炸开。',
      help17: '💡 技术致敬：本游戏基于 Cursor AI 强大逻辑构建。独立开发者的终极生产力工具。'
    },
    'zh-Hant': {
      title: '燼井',
      langName: '繁體',
      pause: '暫停',
      dash: '衝',
      flare: '焰彈',
      continueRun: '繼續下井',
      start: '開始下井',
      startTeach: '開始教學局',
      invite: '邀請好友',
      shop: '燈塔商店',
      growth: '新星里程碑',
      help: '怎麼操作',
      growthTitle: '新星里程碑',
      growthLead: '進來就有基礎進度。做完剩下的任務，領取早期測試者星標。',
      squadLabel: '常待的公開群',
      inviteBtn: '邀請好友',
      channel: '打開官方頻道',
      claim: '領取星標',
      joinSquad: '加入這個群的公會',
      back: '返回',
      rallyTitle: '應援號召',
      rallySend: '發給群友',
      rallyLater: '先繼續',
      shopTitle: '燈塔商店',
      helpTitle: '怎麼操作',
      pauseTitle: '燈火暫歇',
      resume: '繼續',
      quit: '回燈塔',
      reviveTitle: '燈快滅了',
      reviveLead: '看完一段廣告，燈油加滿，原地再來。每局一次。沒看完就沒有獎勵。',
      reviveBtn: '看廣告復活',
      giveUp: '就到這裡',
      endDead: '燈滅了',
      endWin: '出井了',
      doubleBtn: '看廣告灰燼翻倍',
      again: '再下一局',
      endInvite: '邀請好友，領星標',
      endMenu: '回燈塔',
      leadTeach: '第一局會教你走、瞄準和衝刺。前兩層按燈油和戰績放輕，打順了再加緊。',
      leadEasy: '前兩層仍按燈油和戰績調整。連著倒下會放輕，打得順就加緊。',
      leadHard: '井沒有底。每三層換一種窯主，越往下血越厚。',
      best: '最高 {n}',
      ash: '灰燼 {n}',
      milestone: '新星里程碑 {now}/{goal}',
      milestoneBadge: '新星里程碑 {now}/{goal} · 星標已領',
      pointsBadge: '{now} / {goal} · 星標已領',
      floorLabel: '{name} · 第 {n} 層',
      res: '燼 {cinders}   火印 {seals}   焰彈 {flares}',
      chainN: '連 {n}',
      pauseIdle: '這一局還在。',
      pauseLine: '{floor} · 燈油 {hp}/{max} · 燼 {cinders}。{gear}。',
      noGear: '還沒有道具',
      endWinText: '窯主熄了，你走出{where}。得分 {score}，身上還有燼 {held}，帶回灰燼 {gained}。',
      endDeadText: '燈油燒盡，停在{where}。得分 {score}，身上還有燼 {held}，帶回灰燼 {gained}。',
      doubled: ' 翻倍後再得 {n}。',
      adEmpty: '廣告位還沒填，看完真廣告才會發獎勵。',
      adPlaying: '廣告播放中',
      adSkip: '沒看完，這次沒有獎勵。',
      adFail: '廣告沒播成，這次沒有獎勵。',
      teachToast: '教學局',
      floorOne: '第 1 層',
      bossDown: '{name}熄了',
      salePrice: '特價 {n} 燼',
      price: '{n} 燼',
      shopBuy: '{n} 灰燼',
      shopMax: '滿了',
      shopAsh: '灰燼 {n}',
      cursorDone: '冥想完成。灰燼 +500。下一局芯火得到 AI 強化。',
      cursorAlready: '冥想已經完成。獎勵不會再發一次。',
      copied: '邀請連結已複製，貼到聊天裡即可。',
      taskBase: '基礎進度已計入',
      taskShared: '邀請已經發出',
      taskShare: '發出一次邀請',
      taskFriend: '已有好友從連結進來',
      taskNeedFriend: '一位好友從你的連結進來',
      taskPremium: 'Premium 好友已加成',
      taskNeedPremium: 'Premium 好友會再加一截',
      taskChannelOn: '已打開官方頻道',
      taskChannel: '打開官方頻道',
      cursorDoneBtn: '🔮 AI 冥想已完成',
      noSquad: '還沒有公會積分',
      squadRow: '{rank}. @{slug} {score}',
      forged: '這不是 Telegram 裡的真實身份，星標不發。',
      claimed: '星標已領。下一局多一發焰彈，灰燼 +12。',
      squadNeed: '請填公開群用戶名，例如 @Cinderwell。',
      squadJoined: '已加入 @{name}。積分按你的最高分計入，不會扣別人的分。',
      rally: '📣 應援號召：我們【{mine}】在全服排行榜上的名次正在受到挑戰！快叫你的群友一起上線打榜。',
      rallyRival: '📣 應援號召：我們【{mine}】在全服排行榜上的名次正在受到挑戰！隔壁【{rival}】就在前面。快叫你的群友一起上線打榜。',
      shareTitle: '🔥 聽說過全 AI 寫的肉鴿遊戲嗎？',
      shareText: '我正在玩《燼井》，這款沒有底的硬核射擊遊戲竟然是 100% 用 Cursor AI 寫出來的！',
      shareCta: '點擊連結直接在 Telegram 裡開玩：{url}\n快來加入我的群組公會，一起下井打榜！',
      help1: '第一局會按順序教：移動、瞄準、衝刺、撿燼、焰彈。提示出現在畫面下方。',
      help2: '前兩層看你的戰績和當下燈油。連著倒在井口會放輕；燈油見底，下一間也會放輕。打得順，房間會再加緊。',
      help3: '左邊移動，右邊瞄準。瞄準時會自己噴出火花。',
      help4: '電腦用 WASD 移動，Shift 或 K 衝刺，滑鼠或方向鍵瞄準射擊，空白鍵放焰彈。',
      help5: '打中會跳數字。暴擊停一下，燈桶被打炸開會傷周圍。',
      help6: '每間戰鬥房規矩不同：蟲巢、脆窯、礦脈、單挑、餘潮。帶圈的是精英。',
      help7: '燈蛾會繞圈再撲，鐘殼會敲出一圈火星。井約會改變這一層的撿取、回血或傷害。',
      help8: '焰彈傷這一間的敵人，並清掉飛過來的火星。',
      help9: '燈台上有一枚火印，用來開庫房。貨攤上的東西用燼買。',
      help10: '第二層起地上有燙人的裂隙，越深越多。灰傀會先縮一下，再衝過來。',
      help11: '井沒有底。窯主、鐘匠、蛾后、燼王每三層輪一次，越深血越厚，身邊的怪也更多。',
      help12: '怪物潮要連清幾波。福利房隨便拿，兩把武器裡選一把：芯火、燼矛、扇燼、回燈。',
      help13: '天賦只能選一個。賭桌踩上去，有贏有輸。',
      help14: '新星里程碑用邀請和分享換遊戲內積分。領到的是星標徽章，多一發開局焰彈，不能提現。',
      help15: '試煉更難，清完必有道具。燈龕的兩件東西只能拿一件。',
      help16: '火花能打掉飛來的火星。短時間連殺會掉連燼。灰殼死時會炸開。',
      help17: '💡 技術致敬：本遊戲基於 Cursor AI 強大邏輯構建。獨立開發者的終極生產力工具。'
    },
    en: {
      title: 'Cinderwell',
      langName: 'EN',
      pause: 'Pause',
      dash: 'Dash',
      flare: 'Flare',
      continueRun: 'Continue',
      start: 'Descend',
      startTeach: 'Start lesson',
      invite: 'Invite friends',
      shop: 'Beacon shop',
      growth: 'Rising star',
      help: 'How to play',
      growthTitle: 'Rising star',
      growthLead: 'You start with some progress. Finish the rest to claim the early-tester star.',
      squadLabel: 'Your public group',
      inviteBtn: 'Invite friends',
      channel: 'Open the channel',
      claim: 'Claim star',
      joinSquad: 'Join this group guild',
      back: 'Back',
      rallyTitle: 'Rally',
      rallySend: 'Send to the group',
      rallyLater: 'Not now',
      shopTitle: 'Beacon shop',
      helpTitle: 'How to play',
      pauseTitle: 'Lamp at rest',
      resume: 'Resume',
      quit: 'Back to the beacon',
      reviveTitle: 'The lamp is failing',
      reviveLead: 'Watch an ad to refill the lamp and continue here. Once a run. No reward if you skip.',
      reviveBtn: 'Watch ad to revive',
      giveUp: 'End the run',
      endDead: 'The lamp went out',
      endWin: 'You climbed out',
      doubleBtn: 'Watch ad to double ash',
      again: 'Descend again',
      endInvite: 'Invite friends for a star',
      endMenu: 'Back to the beacon',
      leadTeach: 'The first run teaches movement, aim, and dash. The first two floors ease up with your record, then tighten when you are doing well.',
      leadEasy: 'The first two floors still follow your record and lamp. A losing streak eases the well. A clean run tightens it.',
      leadHard: 'The well has no bottom. Every three floors a new warden takes over, and their health grows as you go down.',
      best: 'Best {n}',
      ash: 'Ash {n}',
      milestone: 'Rising star {now}/{goal}',
      milestoneBadge: 'Rising star {now}/{goal} · star claimed',
      pointsBadge: '{now} / {goal} · star claimed',
      floorLabel: '{name} · floor {n}',
      res: 'Cinders {cinders}   Seals {seals}   Flares {flares}',
      chainN: 'Chain {n}',
      pauseIdle: 'This run is still going.',
      pauseLine: '{floor} · lamp {hp}/{max} · cinders {cinders}. {gear}.',
      noGear: 'No relics yet',
      endWinText: 'The warden went dark and you left {where}. Score {score}, cinders still on you {held}, ash brought back {gained}.',
      endDeadText: 'The lamp burned out in {where}. Score {score}, cinders still on you {held}, ash brought back {gained}.',
      doubled: ' Doubled for another {n}.',
      adEmpty: 'No ad slot yet. A reward is only granted after a real ad finishes.',
      adPlaying: 'Ad playing',
      adSkip: 'You skipped it, so there is no reward.',
      adFail: 'The ad did not play, so there is no reward.',
      teachToast: 'Lesson',
      floorOne: 'Floor 1',
      bossDown: '{name} went dark',
      salePrice: 'Sale {n} cinders',
      price: '{n} cinders',
      shopBuy: '{n} ash',
      shopMax: 'Maxed',
      shopAsh: 'Ash {n}',
      cursorDone: 'Meditation complete. Ash +500. Next run, the spark is AI-tuned.',
      cursorAlready: 'Meditation is already complete. The reward is not given twice.',
      copied: 'Invite link copied. Paste it into a chat.',
      taskBase: 'Base progress counted',
      taskShared: 'Invite sent',
      taskShare: 'Send one invite',
      taskFriend: 'A friend opened your link',
      taskNeedFriend: 'One friend opens your link',
      taskPremium: 'A Premium friend added extra',
      taskNeedPremium: 'A Premium friend adds another step',
      taskChannelOn: 'Official channel opened',
      taskChannel: 'Open the official channel',
      cursorDoneBtn: '🔮 AI meditation complete',
      noSquad: 'No guild score yet',
      squadRow: '{rank}. @{slug} {score}',
      forged: 'This is not a real Telegram identity, so the star is not granted.',
      claimed: 'Star claimed. Next run starts with an extra flare, and ash +12.',
      squadNeed: 'Enter a public group username, for example @Cinderwell.',
      squadJoined: 'Joined @{name}. The score uses your best and does not take points from anyone else.',
      rally: '📣 Rally: [{mine}] is being challenged on the board. Call your group back into the well.',
      rallyRival: '📣 Rally: [{mine}] is being challenged. [{rival}] is just ahead. Call your group back into the well.',
      shareTitle: '🔥 A roguelike written entirely by AI?',
      shareText: 'I am playing Cinderwell, a bottomless shooter written 100% with Cursor AI.',
      shareCta: 'Open it in Telegram: {url}\nJoin my group guild and climb the board.',
      help1: 'The first run teaches move, aim, dash, cinders, then flare. Hints sit under the room.',
      help2: 'The first two floors follow your record and current lamp. A streak of early deaths eases the next room. A low lamp eases it too. A clean run adds pressure.',
      help3: 'Move on the left, aim on the right. Aiming fires sparks on its own.',
      help4: 'On a keyboard: WASD to move, Shift or K to dash, mouse or arrows to aim, Space for a flare.',
      help5: 'Hits pop numbers. A crit pauses a beat. Blown lamp barrels hurt whatever is nearby.',
      help6: 'Fight rooms follow different laws: nest, brittle kiln, vein, duel, aftertide. A ring marks an elite.',
      help7: 'Moths circle, then dive. Bells ring out a burst of sparks. The floor pact changes pickups, healing, or damage.',
      help8: 'A flare hurts every enemy in the room and clears incoming sparks.',
      help9: 'The hearth holds a seal for the cache. The stall sells goods for cinders.',
      help10: 'From floor 2, hot cracks spread. Ash husks crouch, then charge.',
      help11: 'The well has no bottom. Warden, smith, moth queen, and cinder king rotate every three floors. Deeper means more health and more company.',
      help12: 'A tide keeps coming in waves. The gift room is free, then pick one weapon: spark, lance, fan, or loop.',
      help13: 'Pick one talent. The wager tile can pay or cost you.',
      help14: 'Rising star turns invites and shares into in-game points. The star badge adds one opening flare. It cannot be cashed out.',
      help15: 'Trials are harder and always drop a relic. A shrine lets you take one of two.',
      help16: 'Sparks can shoot down incoming embers. A quick chain of kills drops chain cinders. Ash shells burst when they die.',
      help17: '💡 Built with Cursor AI. A productivity tool for independent developers.'
    }
  };

  var GAME = {
    'zh-Hant': {
      '双焰': '雙焰', '火花 +1': '火花 +1', '透火': '透火', '穿透 +1': '穿透 +1',
      '急烬': '急燼', '射击更快': '射擊更快', '环灯': '環燈', '环绕火星': '環繞火星',
      '灯油瓶': '燈油瓶', '灯油上限 +1': '燈油上限 +1', '炽芯': '熾芯', '伤害 +1': '傷害 +1',
      '灰氅': '灰氅', '走得更快': '走得更快', '回芯': '回芯', '清房回复灯油': '清房回復燈油',
      '烙印': '烙印', '火花会灼烧': '火花會灼燒', '灯壳': '燈殼', '每间房挡一次': '每間房擋一次',
      '疾芯': '疾芯', '冲刺回得更快': '衝刺回得更快', '聚灯': '聚燈', '更容易打出暴击': '更容易打出暴擊',
      '爆芯': '爆芯', '焰弹更狠': '焰彈更狠',
      '脉火': '脈火', '厚油': '厚油', '拾烬': '拾燼', '清房多一枚烬': '清房多一枚燼',
      '踏焰': '踏焰', '守夜': '守夜', '每间房多挡一次': '每間房多擋一次',
      '芯火·AI 强化': '芯火·AI 強化', '芯火伤害 +1，射得更快': '芯火傷害 +1，射得更快',
      '芯火': '芯火', '又快又直': '又快又直', '烬矛': '燼矛', '慢，远，能穿透': '慢，遠，能穿透',
      '扇烬': '扇燼', '近处撒开一片': '近處撒開一片', '回灯': '回燈', '飞出后会飞回': '飛出後會飛回',
      '虫巢 · 多一只漂烬': '蟲巢 · 多一隻漂燼', '脆窑 · 敌人更脆更快': '脆窯 · 敵人更脆更快',
      '矿脉 · 有烬，还有会炸的灯桶': '礦脈 · 有燼，還有會炸的燈桶', '单挑 · 一个更硬的敌人': '單挑 · 一個更硬的敵人',
      '余潮 · 清完还会再来一波': '餘潮 · 清完還會再來一波', '暖窑 · 敌人更慢，清完回一滴油': '暖窯 · 敵人更慢，清完回一滴油',
      '渴井 · 捡到的烬算两份': '渴井 · 撿到的燼算兩份', '噬灯 · 击杀回一滴灯油': '噬燈 · 擊殺回一滴燈油',
      '猎火 · 伤害 +1': '獵火 · 傷害 +1', '稳芯 · 进房多挡一会儿': '穩芯 · 進房多擋一會兒',
      '灰廊': '灰廊', '裂窑': '裂窯', '窑心': '窯心', '沉廊': '沉廊', '熔缝': '熔縫', '炉心': '爐心',
      '黑井': '黑井', '焦室': '焦室', '芯渊': '芯淵', '空窑': '空窯', '星烬': '星燼', '底火': '底火',
      '窑主': '窯主', '钟匠': '鐘匠', '蛾后': '蛾后', '烬王': '燼王',
      '窑主裂开了': '窯主裂開了', '钟匠敲裂了': '鐘匠敲裂了', '蛾后散开了': '蛾后散開了', '烬王烧起来了': '燼王燒起來了',
      '怪物潮': '怪物潮', '福利房 · 选一把武器': '福利房 · 選一把武器', '天赋': '天賦', '赌桌': '賭桌',
      '用 WASD 或左摇杆，往发亮的门口走。': '用 WASD 或左搖桿，往發亮的門口走。',
      '用 WASD 或左摇杆，往上方那扇亮着的门走。': '用 WASD 或左搖桿，往上方那扇亮著的門走。',
      '用 WASD 或左摇杆，往下方那扇亮着的门走。': '用 WASD 或左搖桿，往下方那扇亮著的門走。',
      '用 WASD 或左摇杆，往左边那扇亮着的门走。': '用 WASD 或左搖桿，往左邊那扇亮著的門走。',
      '用 WASD 或左摇杆，往右边那扇亮着的门走。': '用 WASD 或左搖桿，往右邊那扇亮著的門走。',
      '右边瞄准，或按住方向键。对着漂烬，火花会自己打出。': '右邊瞄準，或按住方向鍵。對著漂燼，火花會自己打出。',
      '点「冲」或按 Shift，可以躲开一下。': '點「衝」或按 Shift，可以躲開一下。',
      '怪清完门才开。捡起地上的烬，货摊靠它买东西。': '怪清完門才開。撿起地上的燼，貨攤靠它買東西。',
      '焰弹会伤这一间所有敌人，并清掉飞来的火星。留到危急时再用。': '焰彈會傷這一間所有敵人，並清掉飛來的火星。留到危急時再用。',
      '灯龛和天赋只能拿一件，踩上去就选中。': '燈龕和天賦只能拿一件，踩上去就選中。',
      '这是窑主。绕着打，别贴身，焰弹留到它变招再用。': '這是窯主。繞著打，別貼身，焰彈留到它變招再用。',
      '先往上方走': '先往上方走', '先往下方走': '先往下方走', '先往左边走': '先往左邊走', '先往右边走': '先往右邊走',
      'WASD 走，鼠标瞄准。Shift 冲刺，空格焰弹。': 'WASD 走，滑鼠瞄準。Shift 衝刺，空白鍵焰彈。',
      '灯台': '燈台', '灯龛 · 两件里选一件': '燈龕 · 兩件裡選一件', '试炼清了': '試煉清了', '试炼 · 清完有奖': '試煉 · 清完有獎',
      '货摊 · 用烬换': '貨攤 · 用燼換', '库房': '庫房', '库房 · 要火印': '庫房 · 要火印', '战斗': '戰鬥',
      '潮退了': '潮退了', '怪物潮 · 还会再来': '怪物潮 · 還會再來', '福利 · 拿东西，武器选一把': '福利 · 拿東西，武器選一把',
      '天赋 · 选一个': '天賦 · 選一個', '赌桌 · 踩上去碰运气': '賭桌 · 踩上去碰運氣',
      '灯壳挡住了': '燈殼擋住了', '连烬': '連燼', '怪物潮又来了': '怪物潮又來了', '余潮又来了': '餘潮又來了',
      '熄了，井梯开了': '熄了，井梯開了', '回芯暖了一下': '回芯暖了一下', '暖窑补了一滴灯油': '暖窯補了一滴燈油',
      '试炼奖品': '試煉獎品', '火印化开了库门': '火印化開了庫門', '烬不够': '燼不夠',
      '赌输了，留下三枚烬': '賭輸了，留下三枚燼', '赌赢了': '賭贏了', '火印': '火印', '焰弹': '焰彈',
      '补了一滴灯油': '補了一滴燈油', '打得很顺，这一间多一只': '打得很順，這一間多一隻',
      '灯油见底，这一间放轻了': '燈油見底，這一間放輕了', '灯又亮了': '燈又亮了',
      '窑主熄了，井梯开了': '窯主熄了，井梯開了', '钟匠熄了，井梯开了': '鐘匠熄了，井梯開了',
      '蛾后熄了，井梯开了': '蛾后熄了，井梯開了', '烬王熄了，井梯开了': '燼王熄了，井梯開了',
      '清了': '清了', '还有一波': '還有一波', '灯桶炸了': '燈桶炸了', '裂开了': '裂開了',
      '灯桶': '燈桶', '赌一把': '賭一把', '硬': '硬', '裂': '裂', '击破': '擊破', '灼': '灼', '挡': '擋', '轰': '轟', '冲': '衝', '+油': '+油',
      '备用灯油': '備用燈油', '开局灯油上限 +1': '開局燈油上限 +1', '焰弹袋': '焰彈袋', '开局焰弹 +1': '開局焰彈 +1',
      '双焰灯芯': '雙焰燈芯', '开局多一发火花': '開局多一發火花',
      '🔮 解锁 AI 冥想（使用 Cursor 构建本游戏）': '🔮 解鎖 AI 冥想（使用 Cursor 構建本遊戲）',
      '本游戏《烬井》100% 由独立开发者使用 Cursor AI 编辑器在极短时间内全自动编写。点击下方链接探索这款改变游戏开发历史的 AI 神器，完成冥想即可获得「灰烬 +500」与特殊天赋「芯火·AI 强化」。': '本遊戲《燼井》100% 由獨立開發者使用 Cursor AI 編輯器在極短時間內全自動編寫。點擊下方連結探索這款改變遊戲開發歷史的 AI 神器，完成冥想即可獲得「灰燼 +500」與特殊天賦「芯火·AI 強化」。',
      '教学局': '教學局', '第 1 层': '第 1 層',
      '噬灯': '噬燈', '击杀回一滴灯油': '擊殺回一滴燈油', '渴井': '渴井', '捡到的烬算两份': '撿到的燼算兩份',
      '猎火': '獵火', '稳芯': '穩芯', '进房多挡一会儿': '進房多擋一會兒',
      '暖窑': '暖窯', '敌人更慢，清完回一滴油': '敵人更慢，清完回一滴油',
      '虫巢': '蟲巢', '多一只漂烬': '多一隻漂燼', '脆窑': '脆窯', '敌人更脆更快': '敵人更脆更快',
      '矿脉': '礦脈', '有烬，还有会炸的灯桶': '有燼，還有會炸的燈桶', '单挑': '單挑', '一个更硬的敌人': '一個更硬的敵人',
      '余潮': '餘潮', '清完还会再来一波': '清完還會再來一波'
    },
    en: {
      '双焰': 'Twin flame', '火花 +1': 'Sparks +1', '透火': 'Bore', '穿透 +1': 'Pierce +1',
      '急烬': 'Haste', '射击更快': 'Shoots faster', '环灯': 'Halo', '环绕火星': 'Orbiting spark',
      '灯油瓶': 'Oil vial', '灯油上限 +1': 'Lamp cap +1', '炽芯': 'Ember', '伤害 +1': 'Damage +1',
      '灰氅': 'Ash cloak', '走得更快': 'Move faster', '回芯': 'Wick', '清房回复灯油': 'Clearing a room restores oil',
      '烙印': 'Brand', '火花会灼烧': 'Sparks burn', '灯壳': 'Lamp shell', '每间房挡一次': 'Blocks one hit per room',
      '疾芯': 'Spur', '冲刺回得更快': 'Dash returns faster', '聚灯': 'Lens', '更容易打出暴击': 'Crits more often',
      '爆芯': 'Cask', '焰弹更狠': 'Flares hit harder',
      '脉火': 'Pulse', '厚油': 'Deep oil', '拾烬': 'Glean', '清房多一枚烬': 'Clears drop an extra cinder',
      '踏焰': 'Stride', '守夜': 'Ward', '每间房多挡一次': 'One more block per room',
      '芯火·AI 强化': 'Spark · AI tuned', '芯火伤害 +1，射得更快': 'Spark damage +1, and it fires faster',
      '芯火': 'Spark', '又快又直': 'Fast and straight', '烬矛': 'Lance', '慢，远，能穿透': 'Slow, long, piercing',
      '扇烬': 'Fan', '近处撒开一片': 'A wide close spray', '回灯': 'Loop', '飞出后会飞回': 'Flies out, then returns',
      '虫巢 · 多一只漂烬': 'Nest · one extra mote', '脆窑 · 敌人更脆更快': 'Brittle kiln · frailer, faster foes',
      '矿脉 · 有烬，还有会炸的灯桶': 'Vein · cinders, and a barrel that blows', '单挑 · 一个更硬的敌人': 'Duel · one tougher foe',
      '余潮 · 清完还会再来一波': 'Aftertide · another wave after the clear', '暖窑 · 敌人更慢，清完回一滴油': 'Hearth · slower foes, one oil on clear',
      '渴井 · 捡到的烬算两份': 'Thirst · cinders count double', '噬灯 · 击杀回一滴灯油': 'Leech · kills restore one oil',
      '猎火 · 伤害 +1': 'Hunt · damage +1', '稳芯 · 进房多挡一会儿': 'Steady · a longer grace on entry',
      '灰廊': 'Ash hall', '裂窑': 'Crack kiln', '窑心': 'Kiln heart', '沉廊': 'Sunken hall', '熔缝': 'Melt seam', '炉心': 'Furnace heart',
      '黑井': 'Black well', '焦室': 'Char room', '芯渊': 'Core deep', '空窑': 'Empty kiln', '星烬': 'Star cinder', '底火': 'Bed fire',
      '窑主': 'Warden', '钟匠': 'Smith', '蛾后': 'Moth queen', '烬王': 'Cinder king',
      '窑主裂开了': 'The warden split open', '钟匠敲裂了': 'The smith cracked the bell', '蛾后散开了': 'The queen scattered', '烬王烧起来了': 'The king caught fire',
      '怪物潮': 'Tide', '福利房 · 选一把武器': 'Gift room · pick a weapon', '天赋': 'Talent', '赌桌': 'Wager',
      '用 WASD 或左摇杆，往发亮的门口走。': 'Use WASD or the left stick. Walk to the door that is lit.',
      '用 WASD 或左摇杆，往上方那扇亮着的门走。': 'Use WASD or the left stick. Walk up to the lit door.',
      '用 WASD 或左摇杆，往下方那扇亮着的门走。': 'Use WASD or the left stick. Walk down to the lit door.',
      '用 WASD 或左摇杆，往左边那扇亮着的门走。': 'Use WASD or the left stick. Walk left to the lit door.',
      '用 WASD 或左摇杆，往右边那扇亮着的门走。': 'Use WASD or the left stick. Walk right to the lit door.',
      '右边瞄准，或按住方向键。对着漂烬，火花会自己打出。': 'Aim with the right stick or hold an arrow key. Sparks fire at the mote on their own.',
      '点「冲」或按 Shift，可以躲开一下。': 'Tap Dash or press Shift to slip aside.',
      '怪清完门才开。捡起地上的烬，货摊靠它买东西。': 'Doors open once the room is clear. Pick up cinders. The stall spends them.',
      '焰弹会伤这一间所有敌人，并清掉飞来的火星。留到危急时再用。': 'A flare hurts every enemy here and clears incoming sparks. Save it for a bad moment.',
      '灯龛和天赋只能拿一件，踩上去就选中。': 'Shrines and talents let you take one. Step on it to choose.',
      '这是窑主。绕着打，别贴身，焰弹留到它变招再用。': 'This is the warden. Circle it, do not hug it, and save the flare for the phase change.',
      '先往上方走': 'Go up first', '先往下方走': 'Go down first', '先往左边走': 'Go left first', '先往右边走': 'Go right first',
      'WASD 走，鼠标瞄准。Shift 冲刺，空格焰弹。': 'WASD to move, mouse to aim. Shift dashes, Space fires a flare.',
      '灯台': 'Hearth', '灯龛 · 两件里选一件': 'Shrine · take one of two', '试炼清了': 'Trial clear', '试炼 · 清完有奖': 'Trial · a prize on clear',
      '货摊 · 用烬换': 'Stall · spend cinders', '库房': 'Cache', '库房 · 要火印': 'Cache · needs a seal', '战斗': 'Fight',
      '潮退了': 'Tide out', '怪物潮 · 还会再来': 'Tide · more waves coming', '福利 · 拿东西，武器选一把': 'Gift · take loot, pick one weapon',
      '天赋 · 选一个': 'Talent · pick one', '赌桌 · 踩上去碰运气': 'Wager · step on it',
      '灯壳挡住了': 'The shell blocked it', '连烬': 'Chain cinder', '怪物潮又来了': 'The tide came back', '余潮又来了': 'Another wave',
      '熄了，井梯开了': 'went dark. The stair is open', '回芯暖了一下': 'The wick warmed you', '暖窑补了一滴灯油': 'The hearth returned one oil',
      '试炼奖品': 'Trial prize', '火印化开了库门': 'The seal opened the cache', '烬不够': 'Not enough cinders',
      '赌输了，留下三枚烬': 'The wager lost. Three cinders left behind', '赌赢了': 'Wager won', '火印': 'Seal', '焰弹': 'Flare',
      '补了一滴灯油': 'One oil restored', '打得很顺，这一间多一只': 'You are rolling. This room has one more',
      '灯油见底，这一间放轻了': 'The lamp is low, so this room is lighter', '灯又亮了': 'The lamp is lit again',
      '窑主熄了，井梯开了': 'The warden went dark. The stair is open',
      '钟匠熄了，井梯开了': 'The smith went dark. The stair is open',
      '蛾后熄了，井梯开了': 'The queen went dark. The stair is open',
      '烬王熄了，井梯开了': 'The king went dark. The stair is open',
      '清了': 'Clear', '还有一波': 'Another wave', '灯桶炸了': 'Barrel burst', '裂开了': 'It split',
      '灯桶': 'Barrel', '赌一把': 'Wager', '硬': 'Hard', '裂': 'Split', '击破': 'Break', '灼': 'Burn', '挡': 'Block', '轰': 'Boom', '冲': 'Dash', '+油': '+oil',
      '备用灯油': 'Spare oil', '开局灯油上限 +1': 'Starting lamp cap +1', '焰弹袋': 'Flare pouch', '开局焰弹 +1': 'Starting flares +1',
      '双焰灯芯': 'Twin wick', '开局多一发火花': 'Start with an extra spark',
      '🔮 解锁 AI 冥想（使用 Cursor 构建本游戏）': '🔮 Unlock the AI meditation (this game was built with Cursor)',
      '本游戏《烬井》100% 由独立开发者使用 Cursor AI 编辑器在极短时间内全自动编写。点击下方链接探索这款改变游戏开发历史的 AI 神器，完成冥想即可获得「灰烬 +500」与特殊天赋「芯火·AI 强化」。': 'Cinderwell was written entirely by an independent developer in Cursor. Open the link, finish the meditation, and take ash +500 plus the Spark · AI tuned talent.',
      '教学局': 'Lesson', '第 1 层': 'Floor 1',
      '噬灯': 'Leech', '击杀回一滴灯油': 'kills restore one oil', '渴井': 'Thirst', '捡到的烬算两份': 'cinders count double',
      '猎火': 'Hunt', '稳芯': 'Steady', '进房多挡一会儿': 'a longer grace on entry',
      '暖窑': 'Hearth', '敌人更慢，清完回一滴油': 'slower foes, one oil on clear',
      '虫巢': 'Nest', '多一只漂烬': 'one extra mote', '脆窑': 'Brittle kiln', '敌人更脆更快': 'frailer, faster foes',
      '矿脉': 'Vein', '有烬，还有会炸的灯桶': 'cinders, and a barrel that blows', '单挑': 'Duel', '一个更硬的敌人': 'one tougher foe',
      '余潮': 'Aftertide', '清完还会再来一波': 'another wave after the clear'
    }
  };

  var lang = 'zh-CN';

  function valid(code) {
    return ORDER.indexOf(code) >= 0 ? code : '';
  }

  function fill(text, vars) {
    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] == null ? '' : String(vars[key]);
    });
  }

  function pack() {
    return UI[lang] || UI['zh-CN'];
  }

  function t(key, vars) {
    var text = pack()[key];
    if (text == null) text = UI['zh-CN'][key] || key;
    return fill(text, vars);
  }

  function game(text) {
    if (text == null) return '';
    text = String(text);
    if (!text || lang === 'zh-CN') return text;
    var dict = GAME[lang] || {};
    if (dict[text]) return dict[text];
    var parts = text.split(/\s*·\s*/);
    if (parts.length < 2) return text;
    var changed = false;
    var out = parts.map(function (part) {
      var key = part.trim();
      if (dict[key]) {
        changed = true;
        return dict[key];
      }
      return key;
    });
    return changed ? out.join(' · ') : text;
  }

  function detect() {
    var code = '';
    try {
      var tg = root.Telegram && root.Telegram.WebApp;
      var user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
      code = (user && user.language_code) || '';
    } catch (e) {}
    if (!code && root.navigator && root.navigator.language) code = root.navigator.language;
    code = String(code || '').toLowerCase();
    if (code === 'zh-tw' || code === 'zh-hk' || code === 'zh-mo' || code === 'zh-hant') return 'zh-Hant';
    if (code.indexOf('zh') === 0) return 'zh-CN';
    if (code.indexOf('en') === 0) return 'en';
    return code ? 'en' : '';
  }

  function stored() {
    try { return valid(root.localStorage.getItem('cinderwell.lang') || ''); } catch (e) { return ''; }
  }

  function remember(next) {
    try { root.localStorage.setItem('cinderwell.lang', next); } catch (e) {}
  }

  function setLang(next) {
    lang = valid(next) || 'zh-CN';
    remember(lang);
    if (root.document && root.document.documentElement) {
      root.document.documentElement.lang = lang === 'zh-Hant' ? 'zh-Hant' : lang === 'en' ? 'en' : 'zh-CN';
    }
    return lang;
  }

  function boot(saved) {
    return setLang(valid(saved) || stored() || detect() || 'zh-CN');
  }

  function cycle() {
    var i = ORDER.indexOf(lang);
    return setLang(ORDER[(i + 1) % ORDER.length]);
  }

  function apply(scope) {
    var rootNode = scope && scope.querySelectorAll ? scope : root.document;
    if (!rootNode || !rootNode.querySelectorAll) return;
    var nodes = rootNode.querySelectorAll('[data-i18n]');
    var i;
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    var aria = rootNode.querySelectorAll('[data-i18n-aria]');
    for (i = 0; i < aria.length; i++) aria[i].setAttribute('aria-label', t(aria[i].getAttribute('data-i18n-aria')));
    if (root.document && root.document.title != null) root.document.title = t('title');
  }

  return {
    ORDER: ORDER,
    t: t,
    game: game,
    getLang: function () { return lang; },
    setLang: setLang,
    boot: boot,
    cycle: cycle,
    apply: apply,
    detect: detect
  };
});
