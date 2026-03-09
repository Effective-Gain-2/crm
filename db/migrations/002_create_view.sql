-- View 1: Resumo diário por tenant 

CREATE OR REPLACE VIEW v_dashboard_daily AS 

SELECT 
  vc.tenant_id, 
  DATE(vc.created_at)                                          AS call_date, 
  COUNT(*)                                                     AS total_attempts, 
  COUNT(*) FILTER (WHERE vc.status='completed')                AS completed, 
  ROUND(COUNT(*) FILTER (WHERE vc.status='completed')::numeric 
    / NULLIF(COUNT(*),0)*100, 1)                               AS pickup_pct, 
  ROUND(AVG(vc.duration_seconds) FILTER (WHERE vc.status='completed'),0) AS avg_duration_s, 
  COUNT(*) FILTER (WHERE vs.classification='hot')              AS hot_count, 
  COUNT(*) FILTER (WHERE vs.classification='warm')             AS warm_count, 
  COUNT(*) FILTER (WHERE vs.classification='cold')             AS cold_count, 
  ROUND(SUM(vco.cost_total_brl), 2)                           AS total_cost_brl, 
  ROUND(AVG(vco.cost_total_brl) FILTER (WHERE vc.status='completed'), 2) AS avg_cost_brl 
FROM voice_calls vc 
LEFT JOIN voice_scores vs  ON vs.call_id  = vc.id 
LEFT JOIN voice_costs  vco ON vco.call_id = vc.id 
GROUP BY vc.tenant_id, DATE(vc.created_at) 
ORDER BY call_date DESC; 

 

-- View 2: Custo por lead HOT 

CREATE OR REPLACE VIEW v_cost_per_hot AS 
SELECT vc.tenant_id, DATE(vc.created_at) AS call_date, 
  ROUND(SUM(vco.cost_total_brl) 
    / NULLIF(COUNT(*) FILTER (WHERE vs.classification='hot'),0), 2) AS cost_per_hot_brl 
FROM voice_calls vc 
JOIN voice_costs  vco ON vco.call_id = vc.id 
JOIN voice_scores vs  ON vs.call_id  = vc.id 
WHERE vc.status='completed' 
GROUP BY vc.tenant_id, DATE(vc.created_at); 

 

-- View 3: Objeções mais comuns 

CREATE OR REPLACE VIEW v_top_objections AS 
SELECT tenant_id, obj, COUNT(*) AS freq 
FROM voice_transcripts, 
     JSONB_ARRAY_ELEMENTS_TEXT(extracted_data->'objections') AS obj 
GROUP BY tenant_id, obj ORDER BY freq DESC; 