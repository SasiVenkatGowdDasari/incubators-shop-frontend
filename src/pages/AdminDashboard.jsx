import { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ManageOrders from '../components/ManageOrders';
import ManageInventory from '../components/ManageInventory';
import DashboardOverview from '../components/DashboardOverview';

export default function AdminDashboard() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const activeTab = searchParams.get('tab') || 'overview';
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (!user || user.role !== 'ADMIN') {
        setTimeout(() => navigate('/'), 0);
        return null;
    }

    const tabs = [
        { id: 'overview', label: 'Dashboard Overview', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { id: 'orders', label: 'Manage Orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
        { id: 'inventory', label: 'Manage Inventory', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> }
    ];

    const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

    return (
        /* REDUCED pt-20 TO pt-6 TO REMOVE EXCESS GAP */
        <div className="min-h-screen bg-[#0B1120] text-gray-200 pb-10 px-4 pt-6">
            <div className="max-w-7xl mx-auto">
                
                {/* HEADER SECTION */}
                <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-500 tracking-tight mb-2">
                            Admin Control Panel
                        </h1>
                        <p className="text-gray-400 font-medium text-sm md:text-base">Manage your store operations, orders, and inventory.</p>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-3 bg-[#111827] px-4 py-2 rounded-full border border-gray-800 shadow-inner w-fit">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-blue-500/30">
                            {user?.fullName?.charAt(0) || 'A'}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-200 leading-none">Admin Mode</span>
                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Online</span>
                        </div>
                    </div>
                </div>

                {/* CUSTOM MOBILE DROPDOWN */}
                <div className="md:hidden mb-6 relative z-30">
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full bg-[#111827] border border-gray-700 text-white font-bold py-4 px-5 rounded-xl shadow-lg flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-blue-400">{currentTab.icon}</span>
                            {currentTab.label}
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col z-40">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setSearchParams({ tab: tab.id }); setIsDropdownOpen(false); }}
                                    className={`w-full text-left px-5 py-4 font-bold flex items-center gap-3 transition border-b border-gray-800 last:border-0 ${
                                        activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* DESKTOP NAVIGATION PILLS */}
                <div className="hidden md:block mb-8 overflow-x-auto pb-2 custom-scrollbar">
                    <div className="inline-flex bg-[#111827] p-1.5 rounded-xl border border-gray-800 shadow-xl min-w-max">
                        {tabs.map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setSearchParams({ tab: tab.id })} 
                                className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* DYNAMIC COMPONENT RENDERING */}
                <div className="animate-fade-in-up">
                    {activeTab === 'overview' && <DashboardOverview />}
                    {activeTab === 'orders' && <ManageOrders />}
                    {activeTab === 'inventory' && <ManageInventory />}
                </div>

            </div>
        </div>
    );
}