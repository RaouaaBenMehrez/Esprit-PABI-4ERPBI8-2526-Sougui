import React from 'react';

const KpiCard = ({ label, value, unit, icon: Icon }) => {
  return (
    <div className="kpi-card group">
      {/* Top icon */}
      <div
        className="flex items-center justify-between mb-5"
      >
        <div
          className="p-3 rounded-xl transition-all group-hover:scale-110"
          style={{
            background: 'rgba(30,90,255,0.1)',
            border: '1px solid rgba(30,90,255,0.15)',
          }}
        >
          {Icon && <Icon size={20} style={{ color: '#4d7fff' }} />}
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: '#2d3f5e' }}
        >
          Live
        </span>
      </div>

      {/* Value */}
      <div>
        <div
          className="font-black mb-1 tracking-tight"
          style={{ fontSize: '30px', color: '#e8eef8', fontFamily: '"DM Sans", sans-serif' }}
        >
          {value}
          <span
            className="font-bold ml-1"
            style={{ fontSize: '16px', color: '#4d7fff' }}
          >
            {unit}
          </span>
        </div>
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: '#4d6080' }}
        >
          {label}
        </span>
      </div>

      {/* Bottom bar */}
      <div
        className="mt-5 h-0.5 rounded-full"
        style={{
          background: 'linear-gradient(90deg, #1e5aff 0%, rgba(30,90,255,0) 100%)',
          opacity: 0.4,
        }}
      />
    </div>
  );
};

export default KpiCard;
