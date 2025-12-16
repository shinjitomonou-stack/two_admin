"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

interface DashboardChartsProps {
    salesData: { month: string; amount: number }[];
    applicationData: { date: string; count: number }[];
    workerData: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function DashboardCharts({ salesData, applicationData, workerData }: DashboardChartsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Chart (Bar) - Takes up 4 columns */}
            <div className="md:col-span-4 bg-white p-6 rounded-xl border border-border shadow-sm">
                <h3 className="font-semibold mb-6">売上推移 (過去6ヶ月)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                dy={10}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `¥${value.toLocaleString()}`}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`¥${value.toLocaleString()}`, "売上"]}
                                cursor={{ fill: "#f3f4f6" }}
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Worker Status (Pie) - Takes up 3 columns */}
            <div className="md:col-span-3 bg-white p-6 rounded-xl border border-border shadow-sm">
                <h3 className="font-semibold mb-6">ワーカー構成比</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={workerData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {workerData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`${value}人`, "人数"]} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Application Trend (Area) - Full width */}
            <div className="md:col-span-7 bg-white p-6 rounded-xl border border-border shadow-sm">
                <h3 className="font-semibold mb-6">日次応募数推移 (過去30日)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={applicationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                dy={10}
                                interval={2} // Show every 3rd label to avoid crowding
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                name="応募数"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorCount)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
