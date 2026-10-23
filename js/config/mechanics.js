/**
 * 15大特殊器皿与机关枚举与教学配置
 */
export const SPECIAL_TYPES = {
  NONE: 'none',
  ICE_BASE: 'ice_base',         // 冰晶凝霜瓶 (不可拿起，可接水，同色热溶解或满瓶破冰)
  STONE_BASE: 'stone_base',     // 鎏金锁扣瓶 (不可拿起，可接水，场上满瓶崩解)
  SILK_DRAPE: 'silk_drape',     // 丝绒磨砂封印瓶 (全锁定，完成指定满瓶揭开)
  FULL_ICE: 'full_ice',         // 极地全冰雕 (全锁定，指定满瓶破冰)
  PAPER_BAG: 'paper_bag',       // 熏琥珀磨砂琉璃秘盒 (全锁定，指定满瓶揭开)
  AD_CAM: 'ad_cam',             // 星璇场记板瓶 (空瓶广告激活)
  COLOR_LOCK: 'color_lock',     // 专属色环契约瓶 (仅允许注入指定颜色，可向外倒)
  ONE_WAY_IN: 'one_way_in',     // 单向接水漏斗瓶 (只进不出，不可拿起)
  ONE_WAY_OUT: 'one_way_out',   // 单向出水古瓶 (只出不进，倒空即化光消失)
  GIANT_CAT: 'giant_cat'        // 皇家灵猫水晶瓶 (不可拿起，8层目标色通关)
};

export const MECHANIC_INTROS = {
  mystery: {
    key: 'mystery',
    title: '星雾盲盒琉璃瓶',
    badge: '新机制解锁',
    desc: '下层药水被星雾遮蔽，倒出顶层药水即可驱散星雾，揭晓真实色彩。',
    tip: '优先倒出顶层药水'
  },
  giant_cat: {
    key: 'giant_cat',
    title: '皇家灵猫水晶瓶',
    badge: 'BOSS试炼',
    desc: '中央矗立巨型灵猫瓶，收集并灌满 8 层目标色秘药即可通关！',
    tip: '汇聚目标色秘药'
  },
  ice_base: {
    key: 'ice_base',
    title: '极地霜晶底座瓶',
    badge: '新机制解锁',
    desc: '被寒霜冻结的瓶子不可拿起，向其注入同色药水或在场上满瓶即可消融霜冻。',
    tip: '直接注入同色或场上满瓶消融'
  },
  silk_drape: {
    key: 'silk_drape',
    title: '星缎礼袍封印瓶',
    badge: '新机制解锁',
    desc: '打包指定数量的满瓶药水，即可掀开丝绒礼袍，解除封印。',
    tip: '优先完成明牌打包'
  },
  varied_height: {
    key: 'varied_height',
    title: '高低错落声学瓶',
    badge: '新机制解锁',
    desc: '2层玲珑瓶、4层标准瓶与6层高瓶同台，各自集满即可自动落塞封存。',
    tip: '注意容量适配，避免死锁'
  },
  tall_8: {
    key: 'tall_8',
    title: '八色皇冠长管瓶',
    badge: '新机制解锁',
    desc: '超长皇冠长管需要集齐整整 8 层同色秘药方可封存。',
    tip: '深度腾挪考验'
  },
  grand_obstacles: {
    key: 'grand_obstacles',
    title: '冰封王座宗师局',
    badge: '宗师试炼',
    desc: '21 瓶全明星阵容！装满并打包指定数量水瓶，破除极寒全冰雕与曜石锁扣。',
    tip: '步步为营规划全局'
  },
  color_lock: {
    key: 'color_lock',
    title: '专属色环契约瓶',
    badge: '新机制解锁',
    desc: '瓶口镶嵌宝石色环，该瓶无论是否为空瓶，仅允许注入对应颜色的药水！',
    tip: '认准瓶口宝石颜色再注入'
  },
  one_way_in: {
    key: 'one_way_in',
    title: '单向接水漏斗瓶',
    badge: '新机制解锁',
    desc: '瓶口内嵌单向漏斗：只能往里接水，绝对不可拿起往外倒出！',
    tip: '不可逆注水，三思后行'
  },
  one_way_out: {
    key: 'one_way_out',
    title: '单向出水古瓶',
    badge: '新机制解锁',
    desc: '单向源泉古瓶：只能往外倒水，不可接水。倒空瞬间化作星尘消散！',
    tip: '排空后不留空瓶，精密计算'
  },
  hourglass_bomb: {
    key: 'hourglass_bomb',
    title: '星砂流沙炸弹瓶',
    badge: '新机制解锁',
    desc: '胸前悬挂流沙怀表，必须在步数归零前将其倒空或装满，否则瓶口将被寒冰封冻！',
    tip: '紧迫倒计时，优先处理'
  }
};
