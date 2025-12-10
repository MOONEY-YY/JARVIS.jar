export interface ChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema?: number;
  upper?: number; // Bollinger Upper
  lower?: number; // Bollinger Lower
  signal?: 'buy' | 'sell' | 'support' | 'resistance' | 'neutral';
  label?: string;
}

// 扩展演示类型以覆盖100+课程
export type DemoScenarioType = 
  // --- 1. 单K线形态 ---
  | 'hammer' | 'shooting_star' | 'hanging_man' | 'inverted_hammer' 
  | 'doji_std' | 'doji_long' | 'doji_dragonfly' | 'doji_gravestone'
  | 'marubozu_bull' | 'marubozu_bear' | 'spinning_top' | 'high_wave'
  // --- 2. 双K线组合 ---
  | 'engulfing_bull' | 'engulfing_bear' | 'harami_bull' | 'harami_bear'
  | 'piercing' | 'dark_cloud' | 'tweezer_top' | 'tweezer_bottom'
  | 'gap_up' | 'gap_down' | 'inside_bar' | 'outside_bar'
  // --- 3. 三K线/多K线组合 ---
  | 'morning_star' | 'evening_star' | 'three_white_soldiers' | 'three_black_crows'
  | 'rising_three' | 'falling_three' | 'tower_top' | 'tower_bottom'
  | 'advance_block' | 'stalled_pattern'
  // --- 4. 经典形态学 ---
  | 'w_bottom' | 'm_top' | 'head_shoulders' | 'head_shoulders_inv'
  | 'round_bottom' | 'round_top' | 'cup_handle'
  | 'triangle_asc' | 'triangle_desc' | 'triangle_sym'
  | 'wedge_rising' | 'wedge_falling' | 'flag_bull' | 'flag_bear'
  | 'rectangle' | 'diamond'
  // --- 5. 指标与策略 ---
  | 'ma_cross_bull' | 'ma_cross_bear' | 'boll_squeeze' | 'boll_break'
  | 'rsi_overbought' | 'rsi_oversold' | 'macd_div_bull' | 'macd_div_bear'
  | 'vol_breakout' | 'support_resist'
  // --- 6. 心理与风控 ---
  | 'fomo_spike' | 'panic_sell' | 'revenge_trade' | 'stop_hunt' | 'generic_trend';

export interface Course {
  id: string;
  title: string;
  category: CategoryId;
  summary: string;
  content: string;
  date: string;
  chartData: ChartPoint[]; // Static preview
  demoType: DemoScenarioType; // Dynamic simulation key
  difficulty: '入门' | '进阶' | '精通' | '高危' | '实战';
}

export type CategoryId = 'basics' | 'kline' | 'pattern' | 'indicator' | 'risk' | 'mindset' | 'cases' | 'tools';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  count: number;
}

export interface PromoLink {
  name: string;
  url: string;
  type: 'primary' | 'standard';
  label?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
}