import axios from 'axios';
import React, { useState, useEffect } from 'react';

function DisparoModal({ theme, disparo = null }) {
  const [titulo, setTitulo] = useState('');
  const [numMensagens, setNumMensagens] = useState(1);
  const [mensagens, setMensagens] = useState(['']); 
  const [canal, setCanal] = useState('');
  const [tipoAlvo, setTipoAlvo] = useState('Funil');
  const [funilSelecionado, setFunilSelecionado] = useState('');
  const [funis, setFunis] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [etapa, setEtapa] = useState('');
  const [tagsSelecionadas, setTagsSelecionadas] = useState([]);
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [intervaloTempo, setIntervaloTempo] = useState(30);
  const [intervaloUnidade, setIntervaloUnidade] = useState('segundos');
  const [conexao, setConexao] = useState([]);

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() =>   {
  const carregarDisparo = async () => {
    if (disparo) {
      if (disparo.start_date) {
        const dateObj = new Date(Number(disparo.start_date));
        setDataInicio(dateObj.toISOString().slice(0, 10));
        setHoraInicio(dateObj.toTimeString().slice(0, 5));
      } else {
        setDataInicio('');
        setHoraInicio('');
      }
      setTitulo(disparo.campaing_name || '');
      setCanal(disparo.connection_id || '');
      setTipoAlvo(disparo.tipoAlvo || 'Funil');
      setFunilSelecionado(disparo.sector || '');
      setEtapa(disparo.kanban_stage);
      setTagsSelecionadas(disparo.tags || []);
      setIntervaloTempo(disparo.intervaloTempo || 30);
      setIntervaloUnidade(disparo.intervaloUnidade || 'segundos');

      try {
        const response = await axios.get(`${url}/campaing/get-messages/${disparo.id}/${schema}`);
        const msgs = Array.isArray(response.data.result) ? response.data.result : [response.data.result];
        const mensagensStrings = msgs.map(msg => typeof msg === 'object' ? msg.value || msg.mensagem || JSON.stringify(msg) : msg);
        setMensagens(mensagensStrings);
        setNumMensagens(mensagensStrings.length);
      } catch (error) {
        setMensagens(['']);
        setNumMensagens(1);
      }
    } else {
      setTitulo('');
      setNumMensagens(1);
      setMensagens(['']);
      setCanal('');
      setTipoAlvo('Funil');
      setFunilSelecionado('');
      setEtapa('');
      setTagsSelecionadas([]);
      setDataInicio('');
      setHoraInicio('');
      setIntervaloTempo(30);
      setIntervaloUnidade('segundos');
    }
  };

  carregarDisparo();
}, [disparo, url, schema]);

  useEffect(() => {
    const fetchConn = async () => {
      try {
        const response = await axios.get(`${url}/connection/get-all-connections/${schema}`);
        setConexao(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        setConexao([]);
      }
    };
    fetchConn();

    const fetchFunis = async () => {
      try {
        const response = await axios.get(`${url}/kanban/get-funis/${schema}`);
        setFunis(Array.isArray(response.data.name) ? response.data.name : []);
      } catch (error) {
        console.error('Erro ao buscar funis:', error);
      }
    };
    fetchFunis();
  }, [url, schema]);

  useEffect(() => {
    if (!funilSelecionado) {
      setEtapas([]);
      setEtapa('');
      return;
    }
    const fetchEtapas = async () => {
      try {
        const response = await axios.get(`${url}/kanban/get-stages/${funilSelecionado.charAt(0).toLowerCase() + funilSelecionado.slice(1)}/${schema}`);
        setEtapas(Array.isArray(response.data) ? response.data : []);
        setEtapa('');
      } catch (error) {
        console.error(error);
        setEtapas([]);
      }
    };
    fetchEtapas();
  }, [funilSelecionado, url, schema]);
  useEffect(() => {
  if (disparo && disparo.kanban_stage && etapas.length > 0) {
    setEtapa(disparo.kanban_stage);
  }
  if (!disparo) {
    setEtapa('');
  }
}, [etapas, disparo]);

  // Lista fictícia de tags
  const tags = [
    { id: 1, nome: "Cliente VIP" },
    { id: 2, nome: "Prospect" },
    { id: 3, nome: "Lead Quente" },
    { id: 4, nome: "Lead Frio" },
    { id: 5, nome: "Abandonou Carrinho" },
    { id: 6, nome: "Newsletter" }
  ];

  // Atualiza array de mensagens quando o número de mensagens muda
  useEffect(() => {
    const novasMensagens = [...mensagens];
    if (numMensagens > mensagens.length) {
      while (novasMensagens.length < numMensagens) {
        novasMensagens.push('');
      }
    } else {
      novasMensagens.splice(numMensagens);
    }
    setMensagens(novasMensagens);
  }, [numMensagens]);

  useEffect(() => {
    if (tipoAlvo === 'Funil') {
      setTagsSelecionadas([]);
    } else {
      setFunilSelecionado('');
      setEtapas([]);
    }
  }, [tipoAlvo]);

  const handleIntervaloChange = (valor, unidade) => {
    let valorEmSegundos;
    switch (unidade) {
      case 'horas':
        valorEmSegundos = valor * 3600;
        break;
      case 'minutos':
        valorEmSegundos = valor * 60;
        break;
      default:
        valorEmSegundos = valor;
    }
    if (valorEmSegundos < 30) {
      if (unidade === 'segundos') {
        setIntervaloTempo(30);
      } else {
        setIntervaloTempo(1);
      }
    } else {
      setIntervaloTempo(valor);
    }
    setIntervaloUnidade(unidade);
  };

  const handleTagSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setTagsSelecionadas(selectedOptions);
  };

  const handleSave = async () => {
    if (!titulo || !canal || !dataInicio || !horaInicio || mensagens.some(msg => !msg)) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (tipoAlvo === 'Tag' && tagsSelecionadas.length === 0) {
      console.error('Selecione pelo menos uma tag.');
      return;
    }
    const start_date = dataInicio && horaInicio
      ? `${dataInicio}T${horaInicio}:00`
      : '';

    const disparoData = {
      name: titulo,
      connection_id: canal,
      sector: funilSelecionado.charAt(0).toLowerCase() + funilSelecionado.slice(1),
      kanban_stage: etapa,
      start_date,
      schema,
      tipoAlvo,
      ...(tipoAlvo === 'Funil' ? { etapa } : { tags: tagsSelecionadas }),
      mensagem: mensagens,
      intervalo: {
        timer: intervaloTempo,
        unidade: intervaloUnidade
      }
    };

    try {
      const endpoint = `${url}/campaing/create`;
      const response = await axios.post(endpoint, {
        ...disparoData,
        ...(disparo ? { campaing_id: disparo.id } : {campaing_id: null})
      });
    } catch (error) {
      console.error('Erro ao salvar disparo:', error);
    }
  };

  return (
    <div className="modal fade" id="DisparoModal" tabIndex="-1" aria-labelledby="DisparoModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-megaphone header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="DisparoModalLabel">
              {disparo ? 'Editar Disparo' : 'Novo Disparo'}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {/* Título */}
            <div className="mb-3">
              <label htmlFor="titulo" className={`form-label card-subtitle-${theme}`}>
                Título
              </label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Digite o título do disparo"
              />
            </div>
            {/* Número de Mensagens */}
            <div className="mb-3">
              <label htmlFor="numMensagens" className={`form-label card-subtitle-${theme}`}>
                Número de Mensagens (1-5)
              </label>
              <input
                type="number"
                className={`form-control input-${theme}`}
                id="numMensagens"
                min="1"
                max="5"
                value={numMensagens}
                onChange={(e) => setNumMensagens(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
            {/* Campos de Mensagens */}
            {Array.isArray(mensagens) && mensagens.map((mensagem, index) => (
              <div className="mb-3" key={index}>
                <label htmlFor={`mensagem${index}`} className={`form-label card-subtitle-${theme}`}>
                  Modelo de mensagem {index + 1}
                </label>
                <textarea
                  className={`form-control input-${theme}`}
                  id={`mensagem${index}`}
                  value={mensagem}
                  onChange={(e) => {
                    const novasMensagens = [...mensagens];
                    novasMensagens[index] = e.target.value;
                    setMensagens(novasMensagens);
                  }}
                  rows="3"
                  placeholder={`Digite a mensagem ${index + 1}`}
                />
              </div>
            ))}
            {/* Grid de 2 colunas para Canal/Tipo e Data/Hora/Intervalo */}
            <div className="row">
              {/* Coluna da Esquerda */}
              <div className="col-6 d-flex flex-column justify-content-center">
                {/* Canal */}
                <div className="mb-3">
                  <label htmlFor="canal" className={`form-label card-subtitle-${theme}`}>
                    Canal
                  </label>
                  <select
                    className={`form-select input-${theme}`}
                    id="canal"
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                  >
                    <option value="" disabled>Selecione um canal</option>
                    {Array.isArray(conexao) && conexao.map((conn) => (
                      <option key={conn.number} value={conn.id}>
                        {conn.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Tipo de Alvo com Seleção de Funil */}
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Tipo de Alvo</label>
                  <div className="d-flex gap-3 align-items-center">
                    <div className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        id="tipoFunil"
                        name="tipoAlvo"
                        value="Funil"
                        checked={tipoAlvo === 'Funil'}
                        onChange={(e) => setTipoAlvo(e.target.value)}
                      />
                      <label className={`form-check-label card-subtitle-${theme}`} htmlFor="tipoFunil">
                        Funil
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        id="tipoTag"
                        name="tipoAlvo"
                        value="Tag"
                        checked={tipoAlvo === 'Tag'}
                        onChange={(e) => setTipoAlvo(e.target.value)}
                      />
                      <label className={`form-check-label card-subtitle-${theme}`} htmlFor="tipoTag">
                        Tag
                      </label>
                    </div>
                    {/* Lista suspensa de Funis */}
                    {tipoAlvo === 'Funil' && (
                      <select
                        className={`form-select input-${theme} ms-3`}
                        value={funilSelecionado}
                        onChange={(e) => setFunilSelecionado(e.target.value)}
                        style={{ width: 'auto', minWidth: '200px' }}
                      >
                        <option value="" disabled>Selecione um funil</option>
                        {funis.map((funil) => (
                          <option key={funil.id} value={funil.id}>
                            {funil.charAt(0).toUpperCase() + funil.slice(1)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {/* Etapa ou Tag (dependendo do tipo de alvo) */}
                {tipoAlvo === 'Funil' ? (
                  <div className="mb-3">
                    <label htmlFor="etapa" className={`form-label card-subtitle-${theme}`}>
                      Etapa
                    </label>
                    <select
                      className={`form-select input-${theme}`}
                      id="etapa"
                      value={etapa}
                      onChange={(e) => setEtapa(e.target.value)}
                    >
                      <option value="" disabled>Selecione uma etapa</option>
                      {Array.isArray(etapas) && etapas.map((etapaObj) => (
                        <option key={etapaObj.id} value={etapaObj.id}>
                          {etapaObj.etapa}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className={`form-label card-subtitle-${theme}`}>
                      Tags (Selecione uma ou mais)
                    </label>
                    <div
                      className={`border rounded p-3 input-${theme}`}
                      style={{
                        height: '140px',
                        overflowY: 'auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '10px'
                      }}
                    >
                      {tags.map((tag) => (
                        <div key={tag.id} className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`tag-${tag.id}`}
                            checked={tagsSelecionadas.includes(tag.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTagsSelecionadas([...tagsSelecionadas, tag.id]);
                              } else {
                                setTagsSelecionadas(tagsSelecionadas.filter(id => id !== tag.id));
                              }
                            }}
                          />
                          <label
                            className={`form-check-label card-subtitle-${theme}`}
                            htmlFor={`tag-${tag.id}`}
                            style={{ cursor: 'pointer' }}
                          >
                            {tag.nome}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Coluna da Direita */}
              <div className="col-6">
                {/* Data de Início */}
                <div className="mb-3">
                  <label htmlFor="dataInicio" className={`form-label card-subtitle-${theme}`}>
                    Data de Início
                  </label>
                  <input
                    type="date"
                    className={`form-control input-${theme}`}
                    id="dataInicio"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                {/* Hora de Início */}
                <div className="mb-3">
                  <label htmlFor="horaInicio" className={`form-label card-subtitle-${theme}`}>
                    Hora de Início
                  </label>
                  <input
                    type="time"
                    className={`form-control input-${theme}`}
                    id="horaInicio"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                  />
                </div>
                {/* Intervalo */}
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Intervalo</label>
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      className={`form-control input-${theme}`}
                      id="intervaloTempo"
                      min="1"
                      value={intervaloTempo}
                      onChange={(e) => handleIntervaloChange(parseInt(e.target.value) || 1, intervaloUnidade)}
                      style={{ width: '100px' }}
                    />
                    <select
                      className={`form-select input-${theme}`}
                      id="intervaloUnidade"
                      value={intervaloUnidade}
                      onChange={(e) => handleIntervaloChange(intervaloTempo, e.target.value)}
                    >
                      <option value="segundos">Segundos</option>
                      <option value="minutos">Minutos</option>
                      <option value="horas">Horas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              data-bs-dismiss="modal"
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`btn btn-1-${theme}`}
              onClick={handleSave}
            >
              {disparo ? 'Salvar Alterações' : 'Criar Disparo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisparoModal;