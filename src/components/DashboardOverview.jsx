import { useState, useEffect } from 'react';
import api from '../services/api';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function DashboardOverview() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- CHART STATE ---
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);
    const [timeframe, setTimeframe] = useState('7days'); 
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    const todayStr = formatDate(new Date()); 
    
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/stats');
                setStats(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load analytics", err);
                setLoading(false);
            }
        };
        
        fetchStats();
        const intervalId = setInterval(fetchStats, 10000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const fetchChartData = async () => {
            setChartLoading(true);
            let start, end;
            const today = new Date();

            if (timeframe === '7days') {
                end = formatDate(today);
                const prev = new Date(); prev.setDate(today.getDate() - 6);
                start = formatDate(prev);
            } else if (timeframe === '30days') {
                end = formatDate(today);
                const prev = new Date(); prev.setDate(today.getDate() - 29);
                start = formatDate(prev);
            } else if (timeframe === 'year') {
                end = formatDate(today);
                start = `${today.getFullYear()}-01-01`; 
            } else if (timeframe === 'custom') {
                if (!customStart || !customEnd) {
                    setChartLoading(false);
                    return; 
                }
                start = customStart;
                end = customEnd;
            }

            try {
                const response = await api.get(`/admin/chart-data?startDate=${start}&endDate=${end}`);
                const formattedData = response.data.map(item => ({
                    ...item,
                    displayDate: new Date(item.name).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                }));
                setChartData(formattedData);
            } catch (err) {
                console.error("Failed to fetch chart data", err);
            } finally {
                setChartLoading(false);
            }
        };

        fetchChartData();
    }, [timeframe, customStart, customEnd]);

    if (loading) return <div className="flex justify-center items-center h-64 text-blue-500 font-bold animate-pulse">Gathering Real-Time Analytics...</div>;
    if (!stats) return <div className="text-red-500 text-center py-8">Failed to connect to analytics engine.</div>;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 md:p-6 shadow-xl flex items-center gap-5 hover:border-green-500/50 transition-colors">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-xl md:text-2xl shadow-[0_0_15px_rgba(34,197,94,0.2)] shrink-0">💰</div>
                    <div>
                        <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                        <h3 className="text-xl md:text-2xl font-extrabold text-white">₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
                    </div>
                </div>
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 md:p-6 shadow-xl flex items-center gap-5 hover:border-blue-500/50 transition-colors">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-xl md:text-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)] shrink-0">📦</div>
                    <div>
                        <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Lifetime Orders</p>
                        <h3 className="text-xl md:text-2xl font-extrabold text-white">{stats.totalOrders}</h3>
                    </div>
                </div>
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 md:p-6 shadow-xl flex items-center gap-5 hover:border-yellow-500/50 transition-colors">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-xl md:text-2xl shadow-[0_0_15px_rgba(234,179,8,0.2)] shrink-0">⏳</div>
                    <div>
                        <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Action Required</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-xl md:text-2xl font-extrabold text-white">{stats.pendingOrders}</h3>
                            <span className="text-[10px] md:text-xs text-yellow-500 font-medium">pending</span>
                        </div>
                    </div>
                </div>
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 md:p-6 shadow-xl flex items-center gap-5 hover:border-red-500/50 transition-colors">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xl md:text-2xl shadow-[0_0_15px_rgba(239,68,68,0.2)] shrink-0">⚠️</div>
                    <div>
                        <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Low Stock Alerts</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-xl md:text-2xl font-extrabold text-white">{stats.lowStockItems}</h3>
                            <span className="text-[10px] md:text-xs text-red-500 font-medium">items</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* REAL INTERACTIVE CHART */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 md:p-8 shadow-xl overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                    <h3 className="text-lg md:text-xl font-bold text-gray-300">Revenue Trend</h3>
                    
                    {/* Filter Buttons (Responsive Scroll on Mobile) */}
                    <div className="flex overflow-x-auto w-full lg:w-auto gap-2 pb-2 lg:pb-0 custom-scrollbar">
                        <button onClick={() => setTimeframe('7days')} className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg border transition ${timeframe === '7days' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>7 Days</button>
                        <button onClick={() => setTimeframe('30days')} className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg border transition ${timeframe === '30days' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>30 Days</button>
                        <button onClick={() => setTimeframe('year')} className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg border transition ${timeframe === 'year' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>This Year</button>
                        <button onClick={() => setTimeframe('custom')} className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg border transition ${timeframe === 'custom' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>Custom Range</button>
                    </div>
                </div>

                {/* DATE PICKERS WITH VALIDATION (Responsive Flex-col on mobile) */}
                {timeframe === 'custom' && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-6 bg-gray-900 p-3 rounded-lg border border-gray-800 w-full sm:w-fit">
                        <div className="w-full sm:w-auto">
                            <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={customStart} 
                                max={customEnd || todayStr} 
                                onChange={(e) => setCustomStart(e.target.value)} 
                                className="w-full sm:w-auto bg-[#111827] text-white text-xs border border-gray-700 rounded p-2 outline-none focus:border-blue-500" 
                            />
                        </div>
                        <span className="hidden sm:block text-gray-600 mt-4">-</span>
                        <div className="w-full sm:w-auto">
                            <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={customEnd} 
                                min={customStart} 
                                max={todayStr}    
                                onChange={(e) => setCustomEnd(e.target.value)} 
                                className="w-full sm:w-auto bg-[#111827] text-white text-xs border border-gray-700 rounded p-2 outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>
                )}

                {/* THE GRAPH (Responsive Height constraint for mobile) */}
                <div className="h-64 sm:h-72 md:h-80 w-full relative -ml-2 md:ml-0">
                    {chartLoading && (
                        <div className="absolute inset-0 z-10 bg-[#111827]/80 backdrop-blur-sm flex items-center justify-center text-blue-400 font-bold rounded-xl">
                            Loading Chart Data...
                        </div>
                    )}
                    
                    {chartData.length === 0 && !chartLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 italic">No revenue recorded in this timeframe.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(value) => `₹${value / 1000}k`} axisLine={false} tickLine={false} width={45} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                                    labelFormatter={(label, payload) => payload[0]?.payload.displayDate}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: '#60A5FA', stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}