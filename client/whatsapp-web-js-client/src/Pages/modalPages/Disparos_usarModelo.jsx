import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';

// Usa um modelo pronto contra uma lista existente: escolhe a lista, marca data e
// hora, e o servidor clona o modelo numa execução própria (o modelo fica intacto).
// Conflito de agenda no canal volta como 409 com o próximo horário livre.
function UsarModeloModal({ theme, show, onHide, modelo, onAgendado }) {
  const [listas, setListas] = useState([]);
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [dataDisparo, setDataDisparo] = useState('');
  const [horaDisparo, setHoraDisparo] = useState('');
  const [agendando, setAgendando] = useState(false);
  const [erro, setErro] = useState(null); // { motivo, proximoLivre }

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    if (!show) return;
    setListaSelecionada('');
    setDataDisparo('');
    setHoraDisparo('');
    setErro(null);
    const carregarListas = async () => {
      try {
        const { data } = await axios.get(`${url}/listas`, { withCredentials: true });
        setListas(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao buscar listas:', error);
        setListas([]);
      }
    };
    carregarListas();
  }, [show, url]);

  const aplicarHorarioSugerido = (ms) => {
    const d = new Date(Number(ms));
    const pad = (n) => String(n).padStart(2, '0');
    setDataDisparo(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setHoraDisparo(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setErro(null);
  };

  const agendar = async () => {
    if (!listaSelecionada) return setErro({ motivo: 'Escolha a lista de contatos.' });
    if (!dataDisparo || !horaDisparo) return setErro({ motivo: 'Informe a data e a hora do disparo.' });

    setAgendando(true);
    setErro(null);
    try {
      const { data } = await axios.post(`${url}/campaing/executar-modelo`, {
        modelo_id: modelo.id,
        lista_id: listaSelecionada,
        start_date: `${dataDisparo}T${horaDisparo}:00-03:00`,
        schema,
      }, { withCredentials: true });

      if (onAgendado) onAgendado(data);
      onHide();
    } catch (error) {
      console.error('Erro ao usar modelo:', error);
      const dados = error.response?.data;
      setErro({
        motivo: dados?.motivo || dados?.erro || 'Erro ao agendar o disparo.',
        proximoLivre: dados?.proximo_horario_livre || null,
      });
    } finally {
      setAgendando(false);
    }
  };

  const listaEscolhida = listas.find((l) => String(l.id) === String(listaSelecionada));

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <Modal.Title className={`header-text-${theme}`}>
          Usar modelo: {modelo?.campaing_name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={`bg-form-${theme}`}>
        <div className="mb-3">
          <Form.Label className={`card-subtitle-${theme}`}>Lista de contatos</Form.Label>
          <Form.Select
            value={listaSelecionada}
            onChange={(e) => { setListaSelecionada(e.target.value); setErro(null); }}
            className={`input-${theme}`}
          >
            <option value="">Selecione uma lista</option>
            {listas.map((lista) => (
              <option key={lista.id} value={lista.id}>
                {lista.nome} ({lista.total_contatos} contatos)
              </option>
            ))}
          </Form.Select>
          {listas.length === 0 && (
            <Form.Text className={`card-subtitle-${theme}`}>
              Nenhuma lista cadastrada. Suba uma em Disparos → Listas ou importe contatos no Kanban.
            </Form.Text>
          )}
          {listaEscolhida && (
            <Form.Text className={`card-subtitle-${theme}`}>
              O disparo vai para os {listaEscolhida.total_contatos} contato(s) desta lista.
            </Form.Text>
          )}
        </div>

        <div className="row g-3">
          <div className="col-6">
            <Form.Label className={`card-subtitle-${theme}`}>Data</Form.Label>
            <Form.Control
              type="date"
              value={dataDisparo}
              onChange={(e) => { setDataDisparo(e.target.value); setErro(null); }}
              className={`input-${theme}`}
            />
          </div>
          <div className="col-6">
            <Form.Label className={`card-subtitle-${theme}`}>Hora</Form.Label>
            <Form.Control
              type="time"
              value={horaDisparo}
              onChange={(e) => { setHoraDisparo(e.target.value); setErro(null); }}
              className={`input-${theme}`}
            />
          </div>
        </div>

        {erro && (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {erro.motivo}
            {erro.proximoLivre && (
              <div className="mt-2">
                <Button size="sm" className={`btn-1-${theme}`} onClick={() => aplicarHorarioSugerido(erro.proximoLivre)}>
                  Usar {new Date(Number(erro.proximoLivre)).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className={`bg-form-${theme}`}>
        <Button onClick={onHide} className={`btn-2-${theme}`}>Cancelar</Button>
        <Button onClick={agendar} className={`btn-1-${theme}`} disabled={agendando}>
          {agendando ? 'Agendando…' : 'Agendar disparo'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UsarModeloModal;
