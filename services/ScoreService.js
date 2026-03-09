function score(ext) { 

  if (!ext.qualifiable || ext.interest_level === 'desinteressado') 

    return { score_composite:0, classification:'disqualified', hot_override:false }; 

 

  // FINANCIAL 40% 

  const fm = {acima_600k:1.0, '300k_600k':0.85, '100k_300k':0.70, 'ate_100k':0.50}; 

  let sf = fm[ext.budget_range] || 0.3; 

  if (ext.has_down_payment) sf = Math.min(1, sf + 0.15); 

  if (ext.down_payment_value > 10000) sf = Math.min(1, sf + 0.10); 

 

  // URGENCY 35% 

  const um = {urgente_3m:1.0, curto_6m:0.85, medio_12m:0.65, longo_24m:0.40, sem_urgencia:0.20}; 

  const su = um[ext.timeline] || 0.3; 

 

  // ENGAGEMENT 25% 

  const em = {alto:1.0, medio:0.70, baixo:0.35}; 

  let se = em[ext.interest_level] || 0.3; 

  if (ext.objections_count > 3) se = Math.max(0, se - 0.15); 

 

  const sc = +(sf*0.40 + su*0.35 + se*0.25).toFixed(3); 

  const hot_override = ext.has_down_payment && ext.down_payment_value > 15000 && sc >= 0.45; 

  const classification = (hot_override || sc >= 0.70) ? 'hot' : sc >= 0.40 ? 'warm' : 'cold'; 

 

  return { score_financial:+sf.toFixed(3), score_urgency:+su.toFixed(3), 

    score_engagement:+se.toFixed(3), score_composite:sc, classification, 

    hot_override: !!hot_override, scoring_version:'v0.1' }; 

} 

module.exports = { score };