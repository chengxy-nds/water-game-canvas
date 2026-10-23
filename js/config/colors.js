/**
 * 8色琉璃秘药色板与主题调色配置
 */
export const COLORS = {
  red: {
    name: '绯红秘药',
    left: '#b30804', mid: '#c40a05', highlight: '#dc1e18', right: '#9c0603',
    topMid: '#e31a1a', topRim: '#fc2829', topLight: '#ff7878',
    bagMain: '#d4151d', bagDark: '#990910'
  },
  yellow: {
    name: '晨曦金露',
    left: '#ebb008', mid: '#fcc00b', highlight: '#ffd438', right: '#d99f04',
    topMid: '#fbd126', topRim: '#ffdb2c', topLight: '#fffb8b',
    bagMain: '#f5a600', bagDark: '#c27d00'
  },
  blue: {
    name: '星穹深蓝',
    left: '#1515ad', mid: '#1b1bc0', highlight: '#3238d9', right: '#101096',
    topMid: '#3a56ca', topRim: '#4a68d8', topLight: '#7a96ff',
    bagMain: '#1c31cc', bagDark: '#101d8a'
  },
  green: {
    name: '森之翠露',
    left: '#689905', mid: '#72a506', highlight: '#86ba14', right: '#588503',
    topMid: '#97cb1d', topRim: '#b2df4f', topLight: '#cff877',
    bagMain: '#5AA21A', bagDark: '#3F7710'
  },
  purple: {
    name: '幽夜紫晶',
    left: '#5f1294', mid: '#7319b0', highlight: '#8e2dcf', right: '#4b0c78',
    topMid: '#9638d6', topRim: '#b055ed', topLight: '#deb3ff',
    bagMain: '#731fa8', bagDark: '#4d1078'
  },
  orange: {
    name: '落日琥珀',
    left: '#cf4400', mid: '#e65000', highlight: '#f5681a', right: '#b03800',
    topMid: '#ff731c', topRim: '#ff8f3d', topLight: '#ffc285',
    bagMain: '#ea5504', bagDark: '#b33c00'
  },
  cyan: {
    name: '极光冰青',
    left: '#0784c4', mid: '#0e9ae0', highlight: '#2bb6f7', right: '#056da6',
    topMid: '#2cb9fc', topRim: '#57ccff', topLight: '#a6e9ff',
    bagMain: '#149ee3', bagDark: '#0b72ab'
  },
  pink: {
    name: '蔷薇星露',
    left: '#c71864', mid: '#e02476', highlight: '#f54290', right: '#a31050',
    topMid: '#f74d97', topRim: '#ff70ae', topLight: '#ffb3d2',
    bagMain: '#e02476', bagDark: '#a31050'
  }
};

export const COLOR_KEYS = ['red', 'yellow', 'blue', 'green', 'purple', 'orange', 'cyan', 'pink'];

export const MYSTERY_COLOR = {
  left: '#03050a',
  mid: '#090c16',
  highlight: '#1c2236',
  right: '#020308',
  topMid: '#151b2e',
  topRim: '#252f4a',
  topLight: '#394668'
};

export const SHOP_THEMES = [
  {
    id: 'zen_amber',
    name: '琥珀禅韵',
    badge: '默认典藏',
    price: 0,
    bgGradient: ['#b59756', '#da9b43', '#88986b'],
    dockBg: 'transparent',
    dockBorder: 'rgba(255, 255, 255, 0.68)'
  },
  {
    id: 'volcanic',
    name: '黑金曜石',
    badge: '幽暗深邃',
    price: 300,
    bgGradient: ['#989aa9', '#8a8d9e', '#62667a'],
    dockBg: '#475199',
    dockBorder: '#9aa7ff'
  },
  {
    id: 'taro',
    name: '紫芋香颂',
    badge: '温柔梦幻',
    price: 500,
    bgGradient: ['#bfaee0', '#a894d1', '#745ea6'],
    dockBg: '#8a6ed1',
    dockBorder: '#decfff'
  },
  {
    id: 'orange',
    name: '落日熔金',
    badge: '暖阳明媚',
    price: 600,
    bgGradient: ['#f7bf88', '#eba463', '#b56928'],
    dockBg: '#e67528',
    dockBorder: '#ffd6b0'
  },
  {
    id: 'beach',
    name: '蔚蓝海岸',
    badge: '夏日清凉',
    price: 800,
    bgGradient: ['#62dce8', '#88e8f2', '#deb981'],
    dockBg: '#36b1e6',
    dockBorder: '#b8f2ff'
  },
  {
    id: 'starlight',
    name: '深海星穹',
    badge: '星辰大海',
    price: 1000,
    bgGradient: ['#191d52', '#0d1030', '#07081c'],
    dockBg: '#21276a',
    dockBorder: '#434ea8'
  },
  {
    id: 'emerald',
    name: '翡翠秘境',
    badge: '森林氧吧',
    price: 1200,
    bgGradient: ['#74c69d', '#52b788', '#2d6a4f'],
    dockBg: '#337a59',
    dockBorder: '#b7e4c7'
  }
];
