import React from 'react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const ChartWidget = ({ title, type, data, height = 300, compact = false, horizontal = false }) => {
  const COLORS = ['#4154f1', '#2eca6a', '#ff771d', '#993d99'];

  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{title}</h3>
      </div>
      
      <div style={{ height: compact ? 200 : height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4154f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4154f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="value" stroke="#4154f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              {horizontal ? (
                <>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={80} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                </>
              )}
              <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" fill="#4154f1" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={20} />
            </BarChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={compact ? 40 : 60}
                outerRadius={compact ? 60 : 80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartWidget;