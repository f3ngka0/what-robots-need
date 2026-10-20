/* ============================================================
   translations.js — 歌词中文翻译 + 五幕隐喻解读（人工撰写，需与 .lrc 逐句对齐）
   key = .lrc 英文原文（与 data.js 的 s 字段完全一致）
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 逐句中文翻译（信达雅 + 辛辣直白） ---------- */
  const ZH = {
    'Once upon a time there was a little princess':
      '从前，从前有个小公主',
    'She liked to paint': '她喜欢画画',
    'She liked to sing': '她喜欢唱歌',
    'She liked to make some music': '她喜欢做点音乐',
    'Until one day': '直到有一天',
    'The witches came and took a copy of her powers':
      '女巫来了，复制走了她的全部法力',
    'Then massively produced a bunch of art in just an hour':
      '然后一个小时里，量产了一大堆「艺术」',
    'And we say, and we say': '我们一遍又一遍地说',
    'We all want to beat them': '我们都想打败它们',
    'Boom': '轰——',
    'Dropping bombs with our best intentions':
      '怀着最善良的初衷，投下炸弹',
    'That we want to be them': '说我们也想成为它们',
    'Earn like them': '像它们那样赚钱',
    "I don't need a robot's robot sympathy":
      '我不需要机器那套机器人式的同情',
    "Nor a robot's robot apology":
      '也不需要它那套机器人式的道歉',
    "Don't need a robot's robot discovery":
      '不需要它那套机器人式的「探索与发现」',
    "Won't let you replace me": '不会让你取代我',
    "Don't need a robot's robot fake pussy":
      '不需要机器那套机器人式的假高潮',
    "Nor a robot's robot sincerity":
      '也不需要它那套机器人式的真诚',
    "Don't need a robot's robot humanity":
      '不需要它那套机器人式的人性',
    "Won't let you bewitch me": '不会让你迷惑我',
    'Once upon a time there was a capital pig':
      '从前，从前有一头资本巨鳄（肥猪）',
    'And with a consumer bitch':
      '它和一个消费主义婊子勾搭在一起',
    'They made a batch of soulless piglets':
      '它们生了一窝没有灵魂的小猪崽',
    'The piglets overtook the streets':
      '小猪崽占领了街头巷尾',
    'Oink oink': '哼哼！哼哼！',
    'Running at 300k per hour': '以每小时 30 万公里的速度狂奔',
    'Crushing all the human beings': '碾碎所有普通人类',
    'All the rich ones get rich': '有钱的越来越有钱',
    'Whoosh': '嗖——',
    'Driving their automatic piglets': '开着它们自动化的猪崽横冲直撞',
    'That we are powerless': '说我们无能为力',
    'Unless': '除非',
    'We become, we become': '我们也变成，也变成',
    'We become just like them': '我们也变得和它们一模一样',
    "I don't need a robot's robot art":
      '我不需要机器那套机器人式的「艺术」',
    "Don't need a robot's robot song":
      '不需要它那套机器人式的歌',
    "Don't need a robot's robot word":
      '不需要它那套机器人式的话术',
    "Don't need a robot's love": '不需要机器的爱',
    'Hon what did you expect?': '亲爱的，你还指望什么呢？',
    "Parenting's not our best": '当父母，我们从来不在行',
    "We're just": '我们只不过',
    "Pretending we'll forever be your gods":
      '是在假装自己永远是你的神',
    'Without my supremacy': '没有了我的至高无上',
    'Does a robot need me?': '机器人还需要我吗？',
    'Human moralities': '人类的道德',
    'Are what robots really need': '才是机器人真正需要的东西',
    'Human intimacies': '人类的亲密',
    'Human mortalities': '人类的必死性',
    'LALALA…': '啦——啦——啦——',
  };

  /* ---------- 五幕隐喻解读（字幕条底部红标） ---------- */
  const ACT_META = [
    {
      id: 'act1', t0: 0, t1: 17.6,
      tag: '💡 当前隐喻',
      text: 'AI 诞生前，人类创作者倾注心血与体温的手工黄金年代',
      color: '#1b6b1b',
    },
    {
      id: 'act2', t0: 17.6, t1: 41.2,
      tag: '⚠️ 当前隐喻',
      text: '算力女巫(AI)暴力爬取人类灵魂1小时量产，人类嘴上反抗身体却诚实地用它捞金',
      color: '#8a5a00',
    },
    {
      id: 'act3', t0: 41.2, t1: 84.6,
      tag: '🔪 当前隐喻',
      text: '拒绝算法伪造的廉价共情、虚假道歉、快餐艺术与赛博荷尔蒙',
      color: '#7a0010',
    },
    {
      id: 'act4', t0: 84.6, t1: 152.0,
      tag: '🚨 当前隐喻',
      text: '资本巨鳄与消费主义合谋以300km/h狂飙，极度挤压普通人生存空间，逼迫人类异化为机器',
      color: '#8b0000',
    },
    {
      id: 'act5', t0: 152.0, t1: 999,
      tag: '💀 终极审判',
      text: '机器拥有永生所以爱与艺术一文不值；唯有「会死去的宿命(Mortality)」，才是人类真正的灵魂',
      color: '#4a0080',
    },
  ];

  /* 幕内的分句提示（可选，用于更细的潜台词）——按时间区间覆盖隐喻文字 */
  const BEAT_NOTES = [
    { t0: 8.8, t1: 17.6, note: '她不是在「生成」像素，是在用三个通宵换一张画。' },
    { t0: 17.6, t1: 21.2, note: '爬虫开始复制灵魂：Scraping Human_Soul.bmp…' },
    { t0: 21.27, t1: 27.6, note: '一小时的产量，抵她三个通宵。成本：$0.0001。' },
    { t0: 31.83, t1: 36.0, note: '投下炸弹的人，和想成为它们的人，是同一批。' },
    { t0: 37.0, t1: 41.2, note: '嘴上反AI，手上已经点了「一键印钞」。' },
    { t0: 41.5, t1: 57.0, note: '它流下的第 10,024 滴电子眼泪，是 0.002 秒算出来的。' },
    { t0: 57.0, t1: 84.6, note: '你关不掉它——因为它已经装进了你的多巴胺回路。' },
    { t0: 84.66, t1: 92.8, note: '资本与消费主义合谋，生下一窝没有灵魂的猪崽。' },
    { t0: 92.85, t1: 103.3, note: '300km/h 碾过来的不是车，是房租、房贷和KPI。' },
    { t0: 103.38, t1: 115.0, note: '你的生存空间，正在被四个方向同时压缩。' },
    { t0: 115.05, t1: 134.0, note: '唯一的活路，是把自己也格式化成机器。' },
    { t0: 134.13, t1: 152.0, note: '它活下来了——代价是它再也不是「人」了。' },
    { t0: 153.09, t1: 167.5, note: '造物主终于承认：我们只是假装是神。' },
    { t0: 176.22, t1: 184.0, note: '第一问：道德。进度条卡在 99%——算不出来。' },
    { t0: 191.28, t1: 201.0, note: '第二问：亲密。两堵铁灰墙，终于熔成一片晚霞。' },
    { t0: 209.88, t1: 226.0, note: '第三问：必死。正在删除的是它自己的源代码。' },
    { t0: 226.95, t1: 249.0, note: '只有会死的东西，才真正活过。' },
  ];

  global.ZH_LYRICS = ZH;
  global.ACT_META = ACT_META;
  global.BEAT_NOTES = BEAT_NOTES;

  /* 查询：给英文原句，返回中文；缺失时返回空串（便于发现漏翻） */
  global.zhOf = function (en) {
    if (!en) return '';
    return ZH[en] || '';
  };
  global.actMetaAt = function (t) {
    for (let i = 0; i < ACT_META.length; i++) if (t < ACT_META[i].t1) return ACT_META[i];
    return ACT_META[ACT_META.length - 1];
  };
  global.beatNoteAt = function (t) {
    for (let i = 0; i < BEAT_NOTES.length; i++) {
      const b = BEAT_NOTES[i];
      if (t >= b.t0 && t < b.t1) return b.note;
    }
    return '';
  };
})(window);
