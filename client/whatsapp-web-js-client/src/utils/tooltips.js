import * as bootstrap from 'bootstrap';

// Bootstrap 5 race: Tooltip.dispose() seta _activeTrigger = null, mas
// transitionend ainda pode disparar depois e chamar
// Tooltip._isWithActiveTrigger, que faz Object.values(this._activeTrigger).
// Patch global one-shot para tornar o método null-safe.
if (!bootstrap.Tooltip.prototype.__activeTriggerPatched) {
  const original = bootstrap.Tooltip.prototype._isWithActiveTrigger;
  bootstrap.Tooltip.prototype._isWithActiveTrigger = function () {
    if (!this._activeTrigger) return false;
    return original.call(this);
  };
  bootstrap.Tooltip.prototype.__activeTriggerPatched = true;
}

// Inicializa tooltips Bootstrap dentro de um container (default: document).
// Evita criar instâncias duplicadas (causa do bug "_activeTrigger is null"
// em Tooltip._isWithActiveTrigger ao trocar de página) e só descarta no
// cleanup as instâncias que ESTE chamador criou — tooltips de outros
// componentes (sidebar, por exemplo) sobrevivem.
export function initTooltips(container = document) {
  if (!container) return () => {};

  const root = container.querySelectorAll ? container : document;
  const triggers = root.querySelectorAll('[data-bs-toggle="tooltip"]');
  const created = [];

  triggers.forEach((el) => {
    if (!el) return;
    if (bootstrap.Tooltip.getInstance(el)) return;
    try {
      created.push(new bootstrap.Tooltip(el));
    } catch (err) {
      console.warn('Falha ao iniciar tooltip:', err);
    }
  });

  return () => {
    created.forEach((tooltip) => {
      try {
        tooltip.dispose();
      } catch (_) { /* tooltip já descartado */ }
    });
  };
}
