import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, Activity, Crosshair, Shield, Brain, Wrench, 
  Search, Menu, X, RotateCcw, Send, Bot, Minimize2, Sparkles, 
  ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Play, Pause
} from 'lucide-react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, ReferenceLine, CartesianGrid, Area, ReferenceDot
} from 'recharts';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { COURSES, CATEGORIES, PROMO_LINKS, COLORS } from './constants';
import { Course, CategoryId, DemoScenarioType, ChatMessage } from './types';

// --- Types ---
interface ScenarioPhase {
  start: number;
  end: number;
  text: string;
}

interface Annotation {
  x: number;
  y: number;
  text: string;
  position: 'top' | 'bottom';
}

interface TrendArrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface GeneratedScenario {
  data: any[];
  phases: ScenarioPhase[];
  annotations: Annotation[];
  trendArrow?: TrendArrow;
  meta: {
    support?: number;
    resistance?: number;
    entry?: number;
    stop?: number;
    patternName: string;
  };
}

// --- UNIVERSAL SCENARIO FACTORY (The Engine) ---
// This engine procedurally generates chart patterns based on configuration
const useScenarioFactory = (course: Course): GeneratedScenario => {
  return useMemo(() => {
    const type = course.demoType;
    const data: any[] = [];
    let price = 42000;
    let phases: ScenarioPhase[] = [];
    let annotations: Annotation[] = [];
    let trendArrow: TrendArrow | undefined;

    // Extract Chinese Name from Title (e.g., "01. 锤子线 (Hammer)" -> "锤子线")
    const cnNameMatch = course.title.match(/^\d+\.\s(.*?)\s\(/);
    const patternName = cnNameMatch ? cnNameMatch[1] : type.replace(/_/g, ' ').toUpperCase();
    
    let meta: any = { patternName };

    // --- Helper Functions ---
    const addCandle = (cfg: {
      openDelta?: number, // Change from prev close
      move?: number,      // Body size (Close - Open)
      highWick?: number,  // Length of upper wick
      lowWick?: number,   // Length of lower wick
      vol?: number,
      gap?: boolean       // If true, openDelta is applied
    }) => {
      const prevClose = data.length > 0 ? data[data.length-1].close : 42000;
      const open = cfg.gap ? prevClose + (cfg.openDelta || 0) : prevClose;
      const close = open + (cfg.move || 0);
      const high = Math.max(open, close) + (cfg.highWick || 10);
      const low = Math.min(open, close) - (cfg.lowWick || 10);
      
      // Indicators
      const prevEma = data.length > 0 ? data[data.length-1].ema : close;
      const ema = close * 0.15 + prevEma * 0.85;
      
      // Bollinger Bands Sim
      const stdDev = 400; 
      const upper = ema + stdDev * 2;
      const lower = ema - stdDev * 2;

      data.push({ 
        id: data.length, date: `T${data.length}`,
        open, close, high, low, 
        volume: cfg.vol || (500 + Math.random()*500),
        ema, upper, lower,
        color: close >= open ? COLORS.up : COLORS.down
      });
      price = close;
    };

    const addTrend = (count: number, dir: 1|-1|0, vol: number = 200) => {
        for(let i=0; i<count; i++) {
            const move = dir * (vol * 0.6) + (Math.random()-0.5) * (vol*0.8);
            addCandle({ move, highWick: vol*0.2, lowWick: vol*0.2 });
        }
    };

    // Helper to add phases based on data length snapshots
    const createPhase = (startIdx: number, text: string) => {
        phases.push({ start: startIdx, end: data.length, text });
        return data.length;
    };

    // --- PATTERN CONFIGURATION MAP ---
    const CONFIG: Record<string, any> = {
        // --- Single Candle ---
        hammer: { setup: 'down', trigger: 'hammer', result: 'up' },
        shooting_star: { setup: 'up', trigger: 'star', result: 'down' },
        hanging_man: { setup: 'up', trigger: 'hammer', result: 'down' },
        inverted_hammer: { setup: 'down', trigger: 'star', result: 'up' },
        doji_std: { setup: 'flat', trigger: 'doji', result: 'volatile' },
        marubozu_bull: { setup: 'flat', trigger: 'big_green', result: 'up' },
        
        // --- Combos ---
        engulfing_bull: { setup: 'down', trigger: 'engulf_bull', result: 'up' },
        engulfing_bear: { setup: 'up', trigger: 'engulf_bear', result: 'down' },
        morning_star: { setup: 'down', trigger: 'm_star', result: 'up' },
        evening_star: { setup: 'up', trigger: 'e_star', result: 'down' },
        three_white_soldiers: { setup: 'down', trigger: '3_soldiers', result: 'up' },
        
        // --- Patterns ---
        w_bottom: { complex: 'w' },
        m_top: { complex: 'm' },
        head_shoulders: { complex: 'hs' },
        head_shoulders_inv: { complex: 'ihs' },
        flag_bull: { complex: 'flag_bull' },
        flag_bear: { complex: 'flag_bear' },
        triangle_asc: { complex: 'tri_asc' },
        
        // --- Indicators ---
        ma_cross_bull: { complex: 'ma_cross_bull' },
        boll_squeeze: { complex: 'boll_squeeze' },
        rsi_oversold: { setup: 'down', trigger: 'hammer', result: 'up' }
    };

    const cfg = CONFIG[type] || { setup: 'volatile', trigger: 'generic', result: 'volatile' };

    // --- GENERATION EXECUTION ---
    
    // 1. Generate History
    addTrend(40, 0, 150); 
    let cursor = 0;
    phases.push({ start: 0, end: 40, text: '前期市场背景' });
    cursor = 40;

    let triggerIdx = -1;
    let trendStartIdx = 40;

    if (cfg.complex) {
        // Complex Patterns
        if(cfg.complex === 'w') {
             addTrend(20, -1); const low1 = price; cursor = createPhase(cursor, '下跌寻底');
             addTrend(15, 1); const neck = price; cursor = createPhase(cursor, '反弹颈线');
             addTrend(15, -1); const low2 = price; cursor = createPhase(cursor, '二次探底');
             
             addCandle({move: 200, vol: 2000}); // Breakout
             triggerIdx = data.length - 1; // Mark breakout as trigger
             
             addTrend(15, 1); cursor = createPhase(cursor, '突破颈线');
             meta.support = Math.min(low1, low2); meta.resistance = neck;
        } 
        else if (cfg.complex === 'm') {
             addTrend(20, 1); cursor = createPhase(cursor, '多头冲顶');
             addTrend(15, -1); const neck = price; cursor = createPhase(cursor, '颈线支撑');
             addTrend(15, 1); cursor = createPhase(cursor, '无力新高');
             
             addCandle({move: -200, vol: 2000});
             triggerIdx = data.length - 1;

             addTrend(15, -1); cursor = createPhase(cursor, '确认见顶');
        }
        else if (cfg.complex === 'hs') {
             addTrend(15, 1); cursor = createPhase(cursor, '左肩形成');
             addTrend(10, -1); 
             addTrend(15, 1); addCandle({move:50}); // Head
             triggerIdx = data.length - 1; // Head top
             addTrend(15, -1); cursor = createPhase(cursor, '头部冲高回落');
             addTrend(10, 1); cursor = createPhase(cursor, '右肩反弹无力');
             addTrend(10, -1); cursor = createPhase(cursor, '跌破颈线');
        }
        else if (cfg.complex === 'flag_bull') {
             addTrend(15, 1, 300); cursor = createPhase(cursor, '旗杆急涨');
             for(let i=0;i<12;i++) addCandle({move: -30}); // Flag
             triggerIdx = data.length - 1; // Flag end
             cursor = createPhase(cursor, '旗面缩量整理');
             addCandle({move: 300, vol: 2000}); 
             addTrend(15, 1); cursor = createPhase(cursor, '放量突破');
        }
        else {
             // Fallback
             addTrend(20, 1); triggerIdx = data.length - 1; addTrend(20, -1);
             cursor = createPhase(cursor, '标准形态演示');
        }

    } else {
        // Simple Patterns (Candlestick specific)
        
        // 1. Setup
        if (cfg.setup === 'down') {
            addTrend(25, -1);
        } else if (cfg.setup === 'up') {
            addTrend(25, 1);
        } else {
            addTrend(25, 0, 100);
        }
        cursor = createPhase(cursor, '市场趋势阶段');

        // Capture trend arrow data
        if (cfg.setup === 'up' || cfg.setup === 'down') {
             trendArrow = {
                 x1: trendStartIdx,
                 y1: data[trendStartIdx].close,
                 x2: data.length - 1,
                 y2: data[data.length-1].close
             };
        }

        // 2. Trigger
        if (cfg.trigger === 'hammer') {
            addCandle({move: 20, lowWick: 150, highWick: 10, vol: 1500});
        } else if (cfg.trigger === 'star') {
            addCandle({move: -20, lowWick: 10, highWick: 150, vol: 1500});
        } else if (cfg.trigger === 'doji') {
            addCandle({move: 2, lowWick: 80, highWick: 80, vol: 800});
        } else if (cfg.trigger === 'engulf_bull') {
            addCandle({move: -50});
            addCandle({move: 120, openDelta: -10, vol: 1800}); 
        } else if (cfg.trigger === 'engulf_bear') {
            addCandle({move: 50});
            addCandle({move: -120, openDelta: 10, vol: 1800});
        } else if (cfg.trigger === 'm_star') {
            addCandle({move: -100});
            addCandle({move: 10, gap: true, openDelta: -30}); 
            addCandle({move: 100, gap: true, openDelta: 30});
        } else if (cfg.trigger === '3_soldiers') {
            addCandle({move: 80}); addCandle({move: 90}); addCandle({move: 100});
        } else {
            addCandle({move: cfg.setup==='up'?-100:100, vol: 1200}); 
        }
        
        triggerIdx = data.length - 1; // Mark the last candle of trigger as key
        cursor = createPhase(cursor, `形态确认: ${patternName}`);

        // 3. Result
        if (cfg.result === 'up') addTrend(30, 1);
        else if (cfg.result === 'down') addTrend(30, -1);
        else addTrend(30, 0, 300);
        cursor = createPhase(cursor, '后续行情验证');
    }

    // Generate Annotation
    if (triggerIdx > 0) {
        // Determine position based on setup/result. 
        // If it's a top pattern (Setup Up -> Result Down), label on top.
        // If it's a bottom pattern (Setup Down -> Result Up), label on bottom.
        const isTop = cfg.setup === 'up' || cfg.result === 'down' || cfg.complex === 'm' || cfg.complex === 'hs';
        
        annotations.push({
            x: triggerIdx,
            y: isTop ? data[triggerIdx].high : data[triggerIdx].low,
            text: patternName,
            position: isTop ? 'top' : 'bottom'
        });
    }

    return { data, phases, meta, annotations, trendArrow };
  }, [course.id, course.demoType]); // Re-run if course changes
};

// --- Custom Chart Components ---

const AnnotationShape = (props: any) => {
    const { cx, cy, payload } = props; // ReferenceDot passes cx, cy
    const { text, position } = payload; // We pass our custom data as payload props to ReferenceDot? 
    // Actually ReferenceDot renders what we pass in `shape`.
    // We need to pass the annotation object to the shape function.
    
    if(!cx || !cy) return null;

    const offset = 40;
    const isTop = position === 'top';
    const textY = isTop ? cy - offset : cy + offset + 10;
    const lineY1 = isTop ? cy - offset + 5 : cy + offset - 15;
    const lineY2 = isTop ? cy - 10 : cy + 10;

    return (
        <g className="animate-in fade-in zoom-in duration-500">
            <text 
                x={cx} 
                y={textY} 
                fill="#fff" 
                textAnchor="middle" 
                fontWeight="bold" 
                fontSize="14"
                className="font-orbitron"
                style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}
            >
                {text}
            </text>
            <line 
                x1={cx} y1={lineY1} 
                x2={cx} y2={lineY2} 
                stroke="#fff" 
                strokeWidth="2" 
            />
            {/* Arrow Head */}
            <path 
                d={isTop 
                    ? `M${cx-4},${lineY2-5} L${cx},${lineY2} L${cx+4},${lineY2-5}`
                    : `M${cx-4},${lineY2+5} L${cx},${lineY2} L${cx+4},${lineY2+5}`
                }
                stroke="#fff"
                strokeWidth="2"
                fill="none"
            />
        </g>
    );
};

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => { setTimeout(onFinish, 1200); }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070F]">
        <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-t-4 border-[#1877F2] rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-b-4 border-[#FFC107] rounded-full animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center font-orbitron font-bold text-3xl text-white tracking-wider">
                J.T.S
            </div>
        </div>
        <div className="flex flex-col items-center space-y-2">
            <span className="text-[#1877F2] font-mono text-sm tracking-[0.5em] animate-pulse">SYSTEM RESTORING</span>
            <span className="text-[#BFC8D2]/50 text-xs">Loading 200+ Modules...</span>
        </div>
    </div>
  );
};

const ChartWidget = ({ course }: { course: Course }) => {
  const { data, phases, meta, annotations, trendArrow } = useScenarioFactory(course);
  const [idx, setIdx] = useState(0);
  const [play, setPlay] = useState(true);
  const [pausedForAnnotation, setPausedForAnnotation] = useState(false);
  
  useEffect(() => { 
    setIdx(0); 
    setPlay(true); 
    setPausedForAnnotation(false); 
  }, [course.id]);

  // Main Timer Loop
  useEffect(() => {
    if(!play || pausedForAnnotation) return;
    
    const interval = setInterval(() => {
        setIdx(prev => {
            // Stop at end
            if(prev >= data.length - 1) {
                setPlay(false);
                return prev;
            }

            // Check if NEXT index has an annotation. If so, move to it, then pause.
            const nextIdx = prev + 1;
            const hasAnnotation = annotations.some(a => a.x === nextIdx);
            
            if (hasAnnotation) {
                setPausedForAnnotation(true);
                // Resume after 3 seconds
                setTimeout(() => {
                    setPausedForAnnotation(false);
                }, 3000);
            }

            return nextIdx;
        });
    }, 150); // Speed of playback

    return () => clearInterval(interval);
  }, [play, pausedForAnnotation, data.length, annotations]);

  // View window logic
  const startIdx = Math.max(0, idx - 80); // Show more context
  const viewData = data.slice(startIdx, idx+1);
  const currentPhase = phases.find(p => idx >= p.start && idx < p.end)?.text || "完成";
  
  // Prepare data for Recharts
  const chartData = viewData.map(d => ({
      ...d,
      body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
      wick: [d.low, d.high]
  }));

  // Determine Y-Axis domain with padding for labels
  const allLows = chartData.map(d => d.low);
  const allHighs = chartData.map(d => d.high);
  const minPrice = Math.min(...allLows);
  const maxPrice = Math.max(...allHighs);
  const padding = (maxPrice - minPrice) * 0.2; 

  // Filter visible annotations and arrow
  const visibleAnnotations = annotations.filter(a => a.x >= startIdx && a.x <= idx);
  const showTrendArrow = trendArrow && trendArrow.x2 <= idx && trendArrow.x1 >= startIdx;

  return (
    <div className="bg-[#0B0E16] rounded-xl border border-[#BFC8D2]/10 h-[500px] flex flex-col shadow-2xl relative overflow-hidden group">
        <div className="h-12 border-b border-[#BFC8D2]/10 flex items-center justify-between px-4 bg-[#1E2330]/30 backdrop-blur">
            <div className="flex items-center gap-3">
                <div onClick={()=>setPlay(!play)} className={`cursor-pointer w-6 h-6 rounded-full flex items-center justify-center ${play ? 'bg-[#FF4444]/20 text-[#FF4444]' : 'bg-[#1877F2]/20 text-[#1877F2]'}`}>
                    {play ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                </div>
                <span className="text-xs font-mono text-[#BFC8D2]">AI SIMULATION: <span className="text-white">{meta.patternName}</span></span>
            </div>
            <RotateCcw onClick={() => { setIdx(0); setPlay(true); setPausedForAnnotation(false); }} className="w-4 h-4 text-[#BFC8D2] cursor-pointer hover:text-[#1877F2] hover:rotate-180 transition-all"/>
        </div>

        <div className="flex-1 w-full relative">
            <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{top:40, right:50, bottom:20, left:10}}>
                    <CartesianGrid stroke="#1E2330" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <XAxis dataKey="date" hide xAxisId="overlay" />

                    <YAxis 
                        orientation="right" 
                        tick={{fontSize:10, fill:'#444'}} 
                        axisLine={false} 
                        tickLine={false} 
                        domain={[minPrice - padding, maxPrice + padding]} 
                    />
                    
                    <Tooltip 
                        contentStyle={{backgroundColor:'#05070F', border:'1px solid #333'}}
                        formatter={(val:any, name:string) => [Number(val).toFixed(2), name==='ema'?'EMA':name]}
                        labelStyle={{display:'none'}}
                    />
                    
                    {data[0].upper && (
                        <Area dataKey="upper" stroke="none" fill="#1877F2" fillOpacity={0.05} />
                    )}
                    
                    <Line dataKey="ema" stroke={COLORS.ma25} dot={false} strokeWidth={1} isAnimationActive={false} />
                    {data[0].upper && <Line dataKey="upper" stroke={COLORS.boll} strokeOpacity={0.3} dot={false} strokeWidth={1} isAnimationActive={false} />}
                    {data[0].upper && <Line dataKey="lower" stroke={COLORS.boll} strokeOpacity={0.3} dot={false} strokeWidth={1} isAnimationActive={false} />}
                    
                    {/* Wicks & Bodies */}
                    <Bar dataKey="wick" barSize={2} xAxisId="overlay" isAnimationActive={false}>
                        {chartData.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                    <Bar dataKey="body" barSize={10} isAnimationActive={false}>
                        {chartData.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Bar>

                    {/* Big Trend Arrow */}
                    {showTrendArrow && trendArrow && (
                        <ReferenceLine 
                            segment={[{ x: trendArrow.x1, y: trendArrow.y1 }, { x: trendArrow.x2, y: trendArrow.y2 }]} 
                            stroke="#F6465D" 
                            strokeWidth={4}
                            strokeOpacity={0.6}
                            ifOverflow="extendDomain"
                            markerEnd="url(#trendArrowHead)"
                        />
                    )}

                    {/* Annotations */}
                    {visibleAnnotations.map((ann, i) => (
                        <ReferenceDot 
                            key={i} 
                            x={`T${ann.x}`} // Use x-axis unit (category or index)
                            y={ann.y} 
                            r={0} // Invisible dot, just anchor
                            shape={(props) => <AnnotationShape {...props} payload={ann} />}
                            ifOverflow="extendDomain"
                        />
                    ))}

                    <defs>
                        <marker id="trendArrowHead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#F6465D" fillOpacity={0.6} />
                        </marker>
                    </defs>

                </ComposedChart>
            </ResponsiveContainer>

            <div className="absolute top-4 left-4 pointer-events-none">
                <div className="bg-[#05070F]/90 border border-[#1877F2]/30 px-3 py-1.5 rounded text-xs text-[#1877F2] font-mono shadow-lg flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    {currentPhase}
                </div>
            </div>
            
            {/* Visual indicator for paused state */}
            {pausedForAnnotation && (
                <div className="absolute bottom-4 right-14 bg-[#1877F2] text-white text-[10px] px-2 py-1 rounded animate-pulse">
                    TEACHING...
                </div>
            )}
        </div>
    </div>
  );
};

const ChatWidget = ({ course, onClose }: { course: Course, onClose: () => void }) => {
  const [msgs, setMsgs] = useState<ChatMessage[]>([{role:'model', text:`你好！我是 Jarvis。正在分析当前课程：《${course.title}》。\n\n我可以为您解释该形态的底层逻辑，或提供风控建议。`}]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), [msgs]);

  const send = async () => {
    if(!input.trim()) return;
    const txt = input;
    setInput('');
    setMsgs(p => [...p, {role:'user', text:txt}]);
    setLoading(true);

    try {
        const ai = new GoogleGenAI({apiKey: process.env.API_KEY || ''});
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: msgs.map(m=>({role:m.role, parts:[{text:m.text}]})),
            config: { systemInstruction: `Crypto Trading Mentor. Context: ${course.title}. Focus on risk management.`}
        });
        const res = await chat.sendMessage({ message: txt });
        setMsgs(p => [...p, {role:'model', text: res.text || '暂无回复'}]);
    } catch(e) {
        setMsgs(p => [...p, {role:'model', text: "网络波动，请重试。"}]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-[90vw] md:w-[380px] h-[500px] bg-[#05070F] border border-[#1877F2]/50 rounded-xl shadow-2xl z-50 flex flex-col glow-pulse">
        <div className="h-12 border-b border-[#1877F2]/20 flex items-center justify-between px-4 bg-[#1877F2]/10">
            <span className="text-[#1877F2] font-bold font-orbitron flex items-center gap-2"><Bot className="w-4 h-4"/> AI MENTOR</span>
            <Minimize2 onClick={onClose} className="w-4 h-4 text-[#BFC8D2] cursor-pointer hover:text-white"/>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 tech-grid">
            {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${m.role==='user'?'bg-[#1877F2] text-white':'bg-[#1E2330] text-[#BFC8D2] border border-[#BFC8D2]/10'}`}>
                        {m.text}
                    </div>
                </div>
            ))}
            {loading && <div className="text-xs text-[#1877F2] animate-pulse ml-4">Jarvis is thinking...</div>}
            <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-[#BFC8D2]/10 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} className="flex-1 bg-[#1E2330] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#1877F2]" placeholder="输入问题..." />
            <button onClick={send} className="p-2 bg-[#1877F2]/20 text-[#1877F2] rounded-lg hover:bg-[#1877F2] hover:text-white transition-all"><Send className="w-5 h-5"/></button>
        </div>
    </div>
  );
};

const App = () => {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course>(COURSES[0]);
  const [activeCat, setActiveCat] = useState<CategoryId>('basics');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
     CATEGORIES.forEach(c => c.count = COURSES.filter(co => co.category === c.id).length);
  }, []);

  const list = COURSES.filter(c => c.category === activeCat && (c.title.includes(search) || c.summary.includes(search)));

  if(loading) return <SplashScreen onFinish={()=>setLoading(false)} />;

  return (
    <div className="h-screen bg-[#05070F] text-[#BFC8D2] flex flex-col font-roboto overflow-hidden">
        {/* Promo Bar - Added '炒币必备交易所' text */}
        <div className="h-8 bg-[#0B0E16] border-b border-[#BFC8D2]/10 flex items-center justify-center gap-4 text-[10px] md:text-xs shrink-0 z-30">
            <span className="text-[#FFC107] font-bold">炒币必备交易所</span>
            {PROMO_LINKS.map((l,i) => (
                <a key={i} href={l.url} target="_blank" className={`px-2 py-0.5 rounded ${l.type==='primary'?'bg-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2] hover:text-white':'text-[#BFC8D2] hover:text-white'}`}>{l.name}</a>
            ))}
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            <div className={`absolute md:relative z-20 w-80 h-full bg-[#0B0E16] border-r border-[#BFC8D2]/10 flex flex-col transition-transform duration-300 ${menuOpen?'translate-x-0':'-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-[#BFC8D2]/10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-bold font-orbitron text-white flex items-center gap-2"><Activity className="text-[#1877F2]"/> JARVIS</span>
                        <X className="md:hidden cursor-pointer" onClick={()=>setMenuOpen(false)}/>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#555]"/>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search 200+ Lessons..." className="w-full bg-[#1E2330] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"/>
                    </div>
                </div>

                <div className="flex overflow-x-auto md:flex-wrap p-2 gap-1 border-b border-[#BFC8D2]/10 shrink-0 no-scrollbar">
                    {CATEGORIES.map(c => (
                        <button key={c.id} onClick={()=>setActiveCat(c.id)} className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all whitespace-nowrap ${activeCat===c.id?'bg-[#1877F2] text-white':'hover:bg-[#1E2330]'}`}>
                            {c.name} <span className="opacity-60 bg-black/20 px-1 rounded">{c.count}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {list.map(c => (
                        <div key={c.id} onClick={()=>{setCourse(c); if(window.innerWidth<768) setMenuOpen(false);}} className={`p-3 rounded-lg border cursor-pointer group transition-all ${course.id===c.id?'bg-[#1877F2]/10 border-[#1877F2]/50':'border-transparent hover:bg-[#1E2330]'}`}>
                            <div className="flex justify-between mb-1">
                                <span className={`text-sm font-medium group-hover:text-white ${course.id===c.id?'text-white':'text-[#BFC8D2]'}`}>{c.title}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.difficulty==='入门'?'bg-green-500/20 text-green-400':c.difficulty==='高危'?'bg-red-500/20 text-red-400':'bg-blue-500/20 text-blue-400'}`}>{c.difficulty}</span>
                            </div>
                            <div className="text-[10px] opacity-50 line-clamp-1">{c.summary}</div>
                        </div>
                    ))}
                    {list.length===0 && <div className="p-8 text-center text-xs opacity-50">No results found.</div>}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full bg-[#05070F] relative w-full">
                {!menuOpen && <button onClick={()=>setMenuOpen(true)} className="absolute top-4 left-4 z-10 p-2 bg-[#1E2330] rounded-lg shadow-lg text-[#BFC8D2] md:hidden"><Menu className="w-5 h-5"/></button>}
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#1877F2] mb-4">
                        <span>{CATEGORIES.find(c=>c.id===course.category)?.name}</span>
                        <ChevronRight className="w-3 h-3"/>
                        <span>LESSON #{course.id}</span>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-bold text-white font-orbitron mb-2">{course.title}</h1>
                    <p className="text-sm text-[#BFC8D2]/60 mb-6 pl-4 border-l-2 border-[#FFC107] italic">{course.summary}</p>

                    <div className="mb-8">
                        <ChartWidget course={course} />
                    </div>

                    <div className="bg-[#0B0E16] border border-[#BFC8D2]/10 rounded-xl p-6 shadow-lg" dangerouslySetInnerHTML={{__html: course.content}} />

                    <div className="mt-12 text-center text-[10px] text-[#BFC8D2]/30 py-8 border-t border-[#BFC8D2]/5">
                        Jarvis Trading System © 2024 • Built with React & GenAI
                    </div>
                </div>

                <div className="absolute bottom-6 right-6 z-40">
                    {!chatOpen && (
                        <button onClick={()=>setChatOpen(true)} className="w-14 h-14 bg-[#1877F2] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform group">
                            <Bot className="w-7 h-7 text-white"/>
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF4444] rounded-full border border-[#05070F]"></span>
                        </button>
                    )}
                </div>
                {chatOpen && <ChatWidget course={course} onClose={()=>setChatOpen(false)} />}
            </div>
        </div>
    </div>
  );
};

export default App;