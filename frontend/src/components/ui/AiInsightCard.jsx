import React from 'react';
import { BrainCircuit, Lightbulb } from 'lucide-react';

const AiInsightCard = ({ insights }) => {
  return (
    <div className="bg-gradient-to-br from-sougui-gold/10 to-sougui-copper/5 border border-sougui-gold/30 rounded-sougui p-6 flex flex-start gap-5 mb-8">
      <div className="bg-sougui-gold/20 p-3 rounded-xl text-sougui-gold h-fit">
        <BrainCircuit size={28} />
      </div>
      <div>
        <h4 className="text-sougui-gold font-bold text-sm mb-2 flex items-center gap-2">
          Insight IA & Recommandations
        </h4>
        <div className="text-sougui-text text-sm leading-relaxed space-y-3">
          {insights.map((insight, idx) => (
            <p key={idx}>
              <strong className="text-sougui-gold">{insight.label} : </strong>
              {insight.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AiInsightCard;
