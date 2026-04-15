import React from 'react';

const KpiCard = ({ label, value, unit, icon: Icon }) => {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative group hover:shadow-md transition-all">
      <div className="absolute top-6 right-6 p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
        <Icon size={24} />
      </div>
      
      <div className="flex flex-col items-center text-center mt-4">
        <div className="text-4xl font-black text-gray-800 mb-2">
          {value}{unit}
        </div>
        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
    </div>
  );
};

export default KpiCard;
