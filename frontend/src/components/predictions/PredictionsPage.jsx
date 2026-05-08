import React, { useState, useEffect } from 'react';
import { BrainCircuit, TrendingUp, Users, Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api';

/* ── Statut des modèles ────────────────────────────────────────────────────── */
const ModelStatusBadge = ({ ok, name }) => (
  <div
    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
    style={{
      background: ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
    }}
  >
    {ok
      ? <CheckCircle size={13} style={{ color: '#22c55e' }} />
      : <AlertCircle size={13} style={{ color: '#ef4444' }} />
    }
    <span style={{ color: ok ? '#22c55e' : '#ef4444' }}>{name}</span>
  </div>
);

/* ── CA Forecast (Prophet) ─────────────────────────────────────────────────── */
const CaForecast = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchForecast = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/predict/ca`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const maxVal = data?.predictions ? Math.max(...data.predictions.map(p => p.max)) : 1;

  return (
    <div className="predict-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(30,90,255,0.1)', border: '1px solid rgba(30,90,255,0.15)' }}>
            <TrendingUp size={20} style={{ color: '#4d7fff' }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: '#e8eef8' }}>Prévision CA — Prophet</h3>
            <p className="text-[11px]" style={{ color: '#4d6080' }}>6 prochains mois · Intervalle de confiance</p>
          </div>
        </div>
        <button
          onClick={fetchForecast}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          style={{
            background: loading ? 'rgba(30,90,255,0.2)' : 'linear-gradient(135deg, #1e5aff, #0f2d80)',
            color: '#fff',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(30,90,255,0.3)',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <BrainCircuit size={13} />}
          {loading ? 'Calcul...' : 'Prévoir'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
          ⚠ {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-10" style={{ color: '#2d3f5e' }}>
          <BrainCircuit size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Cliquez sur "Prévoir" pour lancer le modèle Prophet</p>
        </div>
      )}

      {data?.predictions && (
        <div className="space-y-3">
          {data.predictions.map((p, i) => {
            const pct = (p.prediction / maxVal) * 100;
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium" style={{ color: '#cbd5e8' }}>{p.mois}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: '#4d6080' }}>
                      [{p.min.toLocaleString()} – {p.max.toLocaleString()} DT]
                    </span>
                    <span className="text-sm font-black" style={{ color: '#4d7fff' }}>
                      {p.prediction.toLocaleString()} DT
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30,90,255,0.08)', border: '1px solid rgba(30,90,255,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #0f2d80, #1e5aff)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-[11px] pt-3" style={{ color: '#2d3f5e' }}>
            Modèle : <span style={{ color: '#4d7fff' }}>{data.model}</span> · Horizon : {data.horizon}
          </p>
        </div>
      )}
    </div>
  );
};

/* ── RFM / Client predictor ─────────────────────────────────────────────────── */
const ClientPredictor = () => {
  const [form, setForm]     = useState({ recence: 30, frequence: 5, montant_total: 500, panier_moyen: 100 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const predict = async (endpoint, label) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else setResult({ ...json, _label: label });
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'recence',      label: 'Récence (jours)',  min: 1,   max: 365, step: 1   },
    { key: 'frequence',    label: 'Fréquence (cmd)',  min: 1,   max: 100, step: 1   },
    { key: 'montant_total',label: 'Montant total (DT)',min: 10, max: 50000, step: 10 },
    { key: 'panier_moyen', label: 'Panier moyen (DT)', min: 5,  max: 5000, step: 5  },
  ];

  return (
    <div className="predict-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(30,90,255,0.1)', border: '1px solid rgba(30,90,255,0.15)' }}>
          <Users size={20} style={{ color: '#4d7fff' }} />
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: '#e8eef8' }}>Segmentation Client RFM & XGBoost</h3>
          <p className="text-[11px]" style={{ color: '#4d6080' }}>Prédiction du segment & statut client</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {fields.map(({ key, label, min, max, step }) => (
          <div key={key}>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#4d7fff' }}>
              {label}
            </label>
            <input
              type="number"
              min={min} max={max} step={step}
              value={form[key]}
              onChange={(e) => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
              className="sougui-input text-sm"
              style={{ padding: '10px 14px' }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-5">
        {[
          { endpoint: 'predict/rfm',    label: 'KMeans RFM' },
          { endpoint: 'predict/client', label: 'XGBoost Segment' },
          { endpoint: 'predict/ca-regression', label: 'RF CA Prédit' },
        ].map(({ endpoint, label }) => (
          <button
            key={endpoint}
            onClick={() => predict(endpoint, label)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: 'rgba(30,90,255,0.1)',
              border: '1px solid rgba(30,90,255,0.2)',
              color: '#4d7fff',
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'rgba(30,90,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(30,90,255,0.1)')}
          >
            {loading ? <Loader2 size={11} className="animate-spin mx-auto" /> : label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(30,90,255,0.05)', border: '1px solid rgba(30,90,255,0.15)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#4d6080' }}>
            Résultat — {result._label}
          </p>
          <div className="space-y-2">
            {result.segment && (
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#cbd5e8' }}>Segment</span>
                <span className="badge-blue">{result.segment}</span>
              </div>
            )}
            {result.cluster !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#cbd5e8' }}>Cluster</span>
                <span className="font-bold" style={{ color: '#4d7fff' }}>#{result.cluster}</span>
              </div>
            )}
            {result.confidence !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#cbd5e8' }}>Confiance</span>
                <span className="font-bold" style={{ color: '#22c55e' }}>{result.confidence}%</span>
              </div>
            )}
            {result.ca_predit !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#cbd5e8' }}>CA Prédit</span>
                <span className="font-black text-lg" style={{ color: '#4d7fff' }}>
                  {result.ca_predit.toLocaleString()} DT
                </span>
              </div>
            )}
            <p className="text-[10px] pt-2" style={{ color: '#2d3f5e' }}>
              Modèle : {result.model}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Model Status ──────────────────────────────────────────────────────────── */
const ModelStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/predict/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const modelLabels = {
    prophet_ca:         'Prophet CA',
    rf_regression:      'RF Regression',
    rf_classification:  'RF Classification',
    xgb_regression:     'XGB Regression',
    xgb_classification: 'XGB Classification',
    kmeans_rfm:         'K-Means RFM',
    scaler_regression:  'Scaler',
    le_statut:          'Label Encoder',
  };

  return (
    <div className="predict-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(30,90,255,0.1)', border: '1px solid rgba(30,90,255,0.15)' }}>
          <Activity size={20} style={{ color: '#4d7fff' }} />
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: '#e8eef8' }}>État des Modèles ML</h3>
          <p className="text-[11px]" style={{ color: '#4d6080' }}>Vérifie le chargement de tous les .pkl</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: '#4d6080' }}>
          <Loader2 size={16} className="animate-spin" /> Vérification...
        </div>
      ) : !status ? (
        <div className="text-sm" style={{ color: '#ef4444' }}>Serveur backend non disponible</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(status.models || {}).map(([key, ok]) => (
              <ModelStatusBadge key={key} ok={ok} name={modelLabels[key] || key} />
            ))}
          </div>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{
              background: status.all_ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
              border: `1px solid ${status.all_ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}
          >
            {status.all_ok
              ? <CheckCircle size={16} style={{ color: '#22c55e' }} />
              : <AlertCircle size={16} style={{ color: '#ef4444' }} />
            }
            <span className="text-sm font-bold" style={{ color: status.all_ok ? '#22c55e' : '#ef4444' }}>
              {status.all_ok ? 'Tous les modèles sont prêts ✅' : 'Certains modèles manquent ⚠'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Page Principale ────────────────────────────────────────────────────────── */
const PredictionsPage = () => {
  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold mb-2" style={{ color: '#e8eef8' }}>
          Prédictions{' '}
          <span style={{ color: '#1e5aff' }}>Intelligence</span>
        </h1>
        <p className="text-sm" style={{ color: '#4d6080' }}>
          Modèles ML actifs : Prophet · XGBoost · RandomForest · KMeans
        </p>
      </div>

      <ModelStatus />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CaForecast />
        <ClientPredictor />
      </div>
    </div>
  );
};

export default PredictionsPage;
