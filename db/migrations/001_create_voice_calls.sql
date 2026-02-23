CREATE TABLE IF NOT EXISTS voice_calls ( 
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  tenant_id         VARCHAR(100) NOT NULL, 
  lead_id           UUID NOT NULL, 
  vapi_call_id      VARCHAR(200) UNIQUE, 
  idempotency_key   VARCHAR(200) UNIQUE NOT NULL, 
  status            VARCHAR(50) DEFAULT 'initiated' 
    CHECK (status IN ('initiated','ringing','in_progress','completed', 
    'no_answer','failed','cancelled','blocked_consent','blocked_hours', 
    'blocked_attempts','blocked_cost_cap','blocked_dnc','scheduled')), 
  attempt_number    INTEGER DEFAULT 1, 
  phone_dialed      VARCHAR(30), 
  duration_seconds  INTEGER, 
  prompt_version    VARCHAR(50) DEFAULT 'v1.0', 
  cost_estimated_brl DECIMAL(10,4), 
  compliance_checks  JSONB DEFAULT '{}'::jsonb, 
  metadata_json      JSONB DEFAULT '{}'::jsonb, 
  scheduled_at       TIMESTAMPTZ, 
  started_at         TIMESTAMPTZ, 
  completed_at       TIMESTAMPTZ, 
  created_at         TIMESTAMPTZ DEFAULT NOW(), 
  updated_at         TIMESTAMPTZ DEFAULT NOW() 
); 
CREATE INDEX idx_vc_lead   ON voice_calls(lead_id); 
CREATE INDEX idx_vc_tenant ON voice_calls(tenant_id); 
CREATE INDEX idx_vc_status ON voice_calls(status); 

CREATE TABLE IF NOT EXISTS voice_transcripts ( 
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  call_id        UUID NOT NULL REFERENCES voice_calls(id), 
  tenant_id      VARCHAR(100) NOT NULL, 
  transcript_raw TEXT, 
  extracted_data JSONB DEFAULT '{}'::jsonb, 
  extraction_at  TIMESTAMPTZ DEFAULT NOW() 

); 

 

CREATE TABLE IF NOT EXISTS voice_scores ( 
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  call_id          UUID NOT NULL REFERENCES voice_calls(id), 
  tenant_id        VARCHAR(100) NOT NULL, 
  score_financial  DECIMAL(4,3), 
  score_urgency    DECIMAL(4,3), 
  score_engagement DECIMAL(4,3), 
  score_composite  DECIMAL(4,3), 
  classification   VARCHAR(20) CHECK (classification IN ('hot','warm','cold','disqualified')), 
  hot_override     BOOLEAN DEFAULT false, 
  score_inputs     JSONB DEFAULT '{}'::jsonb, 
  scoring_version  VARCHAR(20) DEFAULT 'v0.1', 
  scored_at        TIMESTAMPTZ DEFAULT NOW() 
); 

 

CREATE TABLE IF NOT EXISTS voice_costs ( 
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  call_id         UUID NOT NULL REFERENCES voice_calls(id), 
  tenant_id       VARCHAR(100) NOT NULL, 
  cost_vapi_usd   DECIMAL(10,6), 
  cost_telnyx_usd DECIMAL(10,6), 
  cost_llm_usd    DECIMAL(10,6), 
  cost_wa_brl     DECIMAL(10,4), 
  cost_total_brl  DECIMAL(10,4), 
  exchange_rate   DECIMAL(8,4) DEFAULT 5.80, 
  recorded_at     TIMESTAMPTZ DEFAULT NOW() 
); 

 

CREATE TABLE IF NOT EXISTS lead_consents ( 
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  lead_id         UUID NOT NULL, 
  tenant_id       VARCHAR(100) NOT NULL, 
  consent_type    VARCHAR(50) DEFAULT 'ai_call', 
  consent_version VARCHAR(20) DEFAULT 'v1.0', 
  consent_text    TEXT NOT NULL, 
  channel         VARCHAR(50), 
  granted_at      TIMESTAMPTZ DEFAULT NOW(), 
  revoked_at      TIMESTAMPTZ, 
  ip_address      INET 
); 

CREATE INDEX idx_consent_lead ON lead_consents(lead_id) WHERE revoked_at IS NULL; 

CREATE TABLE IF NOT EXISTS idempotency_keys ( 
  key          VARCHAR(300) PRIMARY KEY, 
  payload_hash VARCHAR(64), 
  created_at   TIMESTAMPTZ DEFAULT NOW() 
); 

 

CREATE TABLE IF NOT EXISTS dnc_list ( 
  phone    VARCHAR(30) PRIMARY KEY, 
  added_at TIMESTAMPTZ DEFAULT NOW() 
); 
