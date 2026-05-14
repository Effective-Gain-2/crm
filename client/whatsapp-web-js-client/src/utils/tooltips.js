import * as bootstrap from 'bootstrap';

// Bootstrap 5 tem várias races entre Tooltip.dispose() e transitionend.
// Depois do dispose, `_activeTrigger`, `_element` e `tip` viram null, mas
// callbacks já agendados (queueCallback) ainda disparam e acessam essas
// propriedades. Patches globais one-shot:
if (!bootstrap.Tooltip.prototype.__racePatched) {
  // 1) _isWithActiveTrigger faz Object.values(this._activeTrigger).
  const originalIsActive = bootstrap.Tooltip.prototype._isWithActiveTrigger;
  bootstrap.Tooltip.prototype._isWithActiveTrigger = function () {
    if (!this._activeTrigger) return false;
    return originalIsActive.call(this);
  };

  // 2) O complete callback do hide()/show() acessa this._element.removeAttribute
  //    e similares depois do dispose. Wrappa _queueCallback (herdado de
  //    BaseComponent) para engolir TypeErrors de null/undefined access — esses
  //    sempre são pós-dispose, não bugs reais do app.
  const originalQueue = bootstrap.Tooltip.prototype._queueCallback;
  if (originalQueue) {
    bootstrap.Tooltip.prototype._queueCallback = function (callback, element, isAnimated) {
      const safeCallback = () => {
        try {
          callback();
        } catch (err) {
          if (err instanceof TypeError && /(?:null|undefined)/.test(err.message)) {
            // Tooltip já foi descartado entre o agendamento e o disparo — ignora.
            return;
          }
          throw err;
        }
      };
      return originalQueue.call(this, safeCallback, element, isAnimated);
    };
  }

  bootstrap.Tooltip.prototype.__racePatched = true;
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
