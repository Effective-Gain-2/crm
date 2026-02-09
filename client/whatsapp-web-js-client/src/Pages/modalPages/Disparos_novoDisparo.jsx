import { api } from '../../utils/axiosConfig';
import React, { useState, useEffect, useRef } from 'react';
import * as bootstrap from 'bootstrap';
import { useToast } from '../../contexts/ToastContext';


function DisparoModal({ theme, disparo = null, onSave }) {
  const { showError, showSuccess } = useToast();
  const [titulo, setTitulo] = useState('');
  const [numMensagens, setNumMensagens] = useState(1);
  const [mensagens, setMensagens] = useState([
  { text: '', image: null },
]); 
  const [canais, setCanais] = useState([]);
  const [showCanalDropdown, setShowCanalDropdown] = useState(false);
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
  const [intervaloDinamico, setIntervaloDinamico] = useState(false);
  const [intervaloMinimo, setIntervaloMinimo] = useState(30);
  const [intervaloMaximo, setIntervaloMaximo] = useState(60);
  const [intervaloUnidadeMin, setIntervaloUnidadeMin] = useState('segundos');
  const [intervaloUnidadeMax, setIntervaloUnidadeMax] = useState('segundos');
  const [conexao, setConexao] = useState([]);
  const [customFields ,setCustomFields] = useState([])
  const [isDynamicTime, setIsDynamicTime] = useState(true);
  const [customTimeRange, setCustomTimeRange] = useState({
    startTime: '',
    endTime: ''
  });
  const textAreasRef = useRef([]);
  const [mensagensImagens, setMensagensImagens] = useState([]);
  // Estados para transferência de contatos
  const [transferirContato, setTransferirContato] = useState(false);
  const [etapaDestino, setEtapaDestino] = useState('');
  // Estados para envio para fila única
  const [enviarParaFila, setEnviarParaFila] = useState(false);
  const [filaDestino, setFilaDestino] = useState('');
  const [filas, setFilas] = useState([]);
  // Remover todos os estados e lógicas de loading, success, errorMsg
  // Remover feedback visual do botão
  // Remover exibição de erro
  // Voltar handleSave para o formato original, sem loading/success/errorMsg
  // Botão volta ao texto padrão e habilitação padrão
  const [loading, setLoading] = useState(false);

  // Estados para validação de campos obrigatórios
  const [errors, setErrors] = useState({
    titulo: false,
    canais: false,
    dataInicio: false,
    horaInicio: false,
    mensagens: Array(numMensagens).fill(false),
    funilSelecionado: false,
    etapa: false,
    tagsSelecionadas: false,
    etapaDestino: false,
    filaDestino: false
  });


  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;
  const isAdmin = userData?.role === 'admin' || userData?.role === 'tecnico';



  const handleImageUpload = (event, index) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      const novasImagens = [...mensagensImagens];
      novasImagens[index] = base64;
      setMensagensImagens(novasImagens);
    };
    reader.readAsDataURL(file);
  };

const limparBase64 = (base64ComPrefixo) => {
  return base64ComPrefixo.replace(/^data:image\/\w+;base64,/, '');
};

useEffect(() => {
  if (disparo && disparo.min) {
    if (disparo.min) {
      const minEmSegundos = Number(disparo.min) || 30;
      if (minEmSegundos >= 3600) {
        setIntervaloMinimo(Math.floor(minEmSegundos / 3600));
        setIntervaloUnidadeMin('horas');
      } else if (minEmSegundos >= 60) {
        setIntervaloMinimo(Math.floor(minEmSegundos / 60));
        setIntervaloUnidadeMin('minutos');
      } else {
        setIntervaloMinimo(minEmSegundos);
        setIntervaloUnidadeMin('segundos');
      }
      if (disparo.max) {
        const maxEmSegundos = Number(disparo.max) || 60;
        if (maxEmSegundos >= 3600) {
          setIntervaloMaximo(Math.floor(maxEmSegundos / 3600));
          setIntervaloUnidadeMax('horas');
        } else if (maxEmSegundos >= 60) {
          setIntervaloMaximo(Math.floor(maxEmSegundos / 60));
          setIntervaloUnidadeMax('minutos');
        } else {
          setIntervaloMaximo(maxEmSegundos);
          setIntervaloUnidadeMax('segundos');
        }
      }
    }
    
  }
}, [disparo]);
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
    // Buscar conexões da campanha
    const fetchCampaingConns = async()=>{
      try {
        const response = await api.get(`/campaing/get-campaing/${disparo.id}/${schema}`)
        // Garantir que sempre seja um array
        let conexoesArray;
        if (Array.isArray(response.data.connections)) {
          conexoesArray = response.data.connections;
        } else if (response.data.connections) {
          conexoesArray = [response.data.connections];
        } else {
          conexoesArray = [];
        }
                
        // Extrair apenas os connection_ids para o array canais
        const connectionIds = conexoesArray.map(conn => conn.connection_id);
        setCanais(connectionIds)
      } catch (error) {
        setCanais([])
      }
    }
    fetchCampaingConns()
    setTipoAlvo(disparo.tipoAlvo || 'Funil');
    setFunilSelecionado(disparo.sector || '');
    setEtapa(disparo.kanban_stage);
    setTagsSelecionadas(disparo.tags || []);
    
    // Converter o intervalo do banco (em segundos) para a unidade apropriada
    const intervalEmSegundos = Number(disparo.timer) || 30;
    if (intervalEmSegundos >= 3600) {
      setIntervaloTempo(Math.floor(intervalEmSegundos / 3600));
      setIntervaloUnidade('horas');
    } else if (intervalEmSegundos >= 60) {
      setIntervaloTempo(Math.floor(intervalEmSegundos / 60));
      setIntervaloUnidade('minutos');
    } else {
      setIntervaloTempo(intervalEmSegundos);
      setIntervaloUnidade('segundos');
    }

    // Carregar dados do intervalo dinâmico se existir
    if (disparo.min) {
      setIsDynamicTime(true)
      setIntervaloDinamico(true);
      if (disparo.min) {
        const minEmSegundos = Number(disparo.min) || 30;
        if (minEmSegundos >= 3600) {
          setIntervaloMinimo(Math.floor(minEmSegundos / 3600));
          setIntervaloUnidadeMin('horas');
        } else if (minEmSegundos >= 60) {
          setIntervaloMinimo(Math.floor(minEmSegundos / 60));
          setIntervaloUnidadeMin('minutos');
        } else {
          setIntervaloMinimo(minEmSegundos);
          setIntervaloUnidadeMin('segundos');
        }
      }
      if (disparo.max) {
        const maxEmSegundos = Number(disparo.max) || 60;
        if (maxEmSegundos >= 3600) {
          setIntervaloMaximo(Math.floor(maxEmSegundos / 3600));
          setIntervaloUnidadeMax('horas');
        } else if (maxEmSegundos >= 60) {
          setIntervaloMaximo(Math.floor(maxEmSegundos / 60));
          setIntervaloUnidadeMax('minutos');
        } else {
          setIntervaloMaximo(maxEmSegundos);
          setIntervaloUnidadeMax('segundos');
        }
      }
    }

    if(disparo.init_time!==null && disparo.end_time!==null){
      setIsDynamicTime(false)
      setIntervaloDinamico(false)
      setCustomTimeRange({
        startTime: disparo.init_time,
        endTime: disparo.end_time
      })
    }

    try {
      const response = await api.get(`/campaing/get-messages/${disparo.id}/${schema}`)
      const msgs = response.data.result || [];

      const mensagensFormatadas = msgs.map(msg => ({
        id: msg.id || null,
        text: msg.value || '', // Usar 'value' que é o campo correto no banco
        image: msg.image || null
      }));
      
      const imagensFormatadas = mensagensFormatadas.map(msg =>
        msg.image ? `data:image/jpeg;base64,${msg.image}` : null
      );

      setMensagens(mensagensFormatadas);
      setMensagensImagens(imagensFormatadas);
      setNumMensagens(mensagensFormatadas.length);
      
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMensagens([{ text: '', image: null }]);
      setMensagensImagens([null]);
      setNumMensagens(1);
    }

    // Carregar dados de transferência se existir
    if (disparo && disparo.transferir_contato) {
      setTransferirContato(true);
      setEtapaDestino(disparo.new_stage || '');
    } else {
      setTransferirContato(false);
      setEtapaDestino('');
    }

    // Carregar dados de fila única se existir
    if (disparo && (disparo.enviar_para_fila_unica || disparo.queue_id)) {
      setEnviarParaFila(true);
      setFilaDestino(disparo.queue_id || '');
    } else {
      setEnviarParaFila(false);
      setFilaDestino('');
    }
    
    // Limpar erros quando carregar disparo
    setErrors({
      titulo: false,
      canais: false,
      dataInicio: false,
      horaInicio: false,
      mensagens: Array(numMensagens).fill(false),
      funilSelecionado: false,
      etapa: false,
      tagsSelecionadas: false,
      etapaDestino: false,
      filaDestino: false
    });
  } else {
    setTitulo('');
    setNumMensagens(1);
    setMensagens([{ text: '', image: null }]);
    setMensagensImagens([null]);
    setCanais([]);
    setShowCanalDropdown(false);
    setTipoAlvo('Funil');
    setFunilSelecionado('');
    setEtapa('');
    setTagsSelecionadas([]);
    setDataInicio('');
    setHoraInicio('');
    setIntervaloTempo(30);
    setIntervaloUnidade('segundos');
    setIntervaloDinamico(false);
    setIntervaloMinimo(30);
    setIntervaloMaximo(60);
    setIntervaloUnidadeMin('segundos');
    setIntervaloUnidadeMax('segundos');
    setTransferirContato(false);
    setEtapaDestino('');
    setEnviarParaFila(false);
    setFilaDestino('');
    
    // Limpar erros quando carregar disparo
    setErrors({
      titulo: false,
      canais: false,
      dataInicio: false,
      horaInicio: false,
      mensagens: Array(numMensagens).fill(false),
      funilSelecionado: false,
      etapa: false,
      tagsSelecionadas: false,
      etapaDestino: false,
      filaDestino: false
    });
  }
};


  carregarDisparo();
}, [disparo, url, schema]);

 

  useEffect(() => {
    const fetchConn = async () => {
      try {
        const response = await api.get(`/connection/get-all-connections/${schema}`)
        setConexao(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        setConexao([]);
      }
    };
    fetchConn();

    const fetchFunis = async () => {
      try {
        const response = await api.get(`/kanban/get-funis/${schema}`)
        setFunis(Array.isArray(response.data.name) ? response.data.name : []);
      } catch (error) {
        console.error('Erro ao buscar funis:', error);
      }
    };
    fetchFunis();

    // Buscar filas disponíveis (silenciosamente; ignora erro se endpoint não existir)
    const fetchFilas = async () => {
      try {
        // Tentativas de endpoints comuns; use o primeiro que responder
        const tentativa1 = api.get(`/queue/get-all-queues/${schema}`).catch(() => null);
        const [r1] = await Promise.all([tentativa1]);
        const resp = r1 ;
        let lista = [];
        if (resp && Array.isArray(resp.data)) {
          lista = resp.data;
        } else if (resp && Array.isArray(resp.data?.result)) {
          lista = resp.data.result;
        } else {
          lista = [];
        }
        // Normaliza para { id, name }
        const normalizada = lista.map((item) => {
          const id = item.id ?? item.queue_id ?? item.value ?? item.uuid ?? '';
          const name = item.label ?? item.name ?? item.titulo ?? item.title ?? `Fila ${id}`;
          return { id, name };
        }).filter(f => f.id !== '');
        setFilas(normalizada);
      } catch (error) {
        setFilas([]);
      }
    };
    fetchFilas();
  }, [url, schema]);



  useEffect(() => {
    if (!funilSelecionado) {
      setEtapas([]);
      setEtapa('');
      return;
    }
    const fetchEtapas = async () => {
      try {
        const response = await api.get(`/kanban/get-stages/${funilSelecionado.charAt(0).toLowerCase() + funilSelecionado.slice(1)}/${schema}`)
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
  const fetchCustomFields = async () => {
  const response = await api.get(`/kanban/get-custom-fields/${schema}`)
  setCustomFields(Array.isArray(response.data) ? response.data : [response.data])
  }
  fetchCustomFields()
}, [etapas, disparo]);


    // Atualiza array de mensagens quando o número de mensagens muda
  useEffect(() => {
    const novasMensagens = [...mensagens];
    if (numMensagens > mensagens.length) {
      while (novasMensagens.length < numMensagens) {
       novasMensagens.push({ text: '', image: null }); 
      }
    } else {
      novasMensagens.splice(numMensagens);
    }
    setMensagens(novasMensagens);
    
    // Atualizar array de erros de mensagens
    setErrors(prev => ({
      ...prev,
      mensagens: Array(numMensagens).fill(false)
    }));
  }, [numMensagens]);

  useEffect(() => {
    if (tipoAlvo === 'Funil') {
      setTagsSelecionadas([]);
      // Limpar erro de tags quando mudar para Funil
      setErrors(prev => ({ ...prev, tagsSelecionadas: false }));
    } else {
      setFunilSelecionado('');
      setEtapas([]);
      setTransferirContato(false);
      setEtapaDestino('');
      // Limpar erros de funil e etapa quando mudar para Tag
      setErrors(prev => ({ 
        ...prev, 
        funilSelecionado: false, 
        etapa: false,
        etapaDestino: false 
      }));
    }
  }, [tipoAlvo]);

  // Limpar etapa de destino quando a etapa atual mudar
  useEffect(() => {
    if (etapaDestino === etapa) {
      setEtapaDestino('');
      setErrors(prev => ({ ...prev, etapaDestino: false }));
    }
  }, [etapa, etapaDestino]);

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

  const handleIntervaloDinamicoChange = (valor, unidade, tipo) => {
    // Converte valor para segundos para validação
    const toSeconds = (v, u) => {
      switch (u) {
        case 'horas': return v * 3600;
        case 'minutos': return v * 60;
        default: return v;
      }
    };
    let valorEmSegundos = toSeconds(valor, unidade);
    let minEmSegundos = toSeconds(tipo === 'min' ? valor : intervaloMinimo, tipo === 'min' ? unidade : intervaloUnidadeMin);
    let maxEmSegundos = toSeconds(tipo === 'max' ? valor : intervaloMaximo, tipo === 'max' ? unidade : intervaloUnidadeMax);

    // min nunca menor que 30 segundos
    if (tipo === 'min' && valorEmSegundos < 30) {
      valorEmSegundos = 30;
      valor = unidade === 'horas' ? Math.ceil(30 / 3600) : unidade === 'minutos' ? Math.ceil(30 / 60) : 30;
    }
    // max nunca menor que 31 segundos
    if (tipo === 'max' && valorEmSegundos < 31) {
      valorEmSegundos = 31;
      valor = unidade === 'horas' ? Math.ceil(31 / 3600) : unidade === 'minutos' ? Math.ceil(31 / 60) : 31;
    }

    // max sempre maior que min
    if (tipo === 'min' && valorEmSegundos >= maxEmSegundos) {
      // Ajusta max para ser 1 segundo maior
      maxEmSegundos = valorEmSegundos + 1;
      if (unidade === intervaloUnidadeMax) {
        // Mantém unidade
        setIntervaloMaximo(unidade === 'horas' ? Math.ceil(maxEmSegundos / 3600) : unidade === 'minutos' ? Math.ceil(maxEmSegundos / 60) : maxEmSegundos);
      } else {
        // Converte para unidade atual de max
        setIntervaloMaximo(intervaloUnidadeMax === 'horas' ? Math.ceil(maxEmSegundos / 3600) : intervaloUnidadeMax === 'minutos' ? Math.ceil(maxEmSegundos / 60) : maxEmSegundos);
      }
    }
    if (tipo === 'max' && valorEmSegundos <= minEmSegundos) {
      // Ajusta min para ser 1 segundo menor
      minEmSegundos = valorEmSegundos - 1;
      if (unidade === intervaloUnidadeMin) {
        setIntervaloMinimo(unidade === 'horas' ? Math.floor(minEmSegundos / 3600) : unidade === 'minutos' ? Math.floor(minEmSegundos / 60) : minEmSegundos);
      } else {
        setIntervaloMinimo(intervaloUnidadeMin === 'horas' ? Math.floor(minEmSegundos / 3600) : intervaloUnidadeMin === 'minutos' ? Math.floor(minEmSegundos / 60) : minEmSegundos);
      }
    }

    if (tipo === 'min') {
      setIntervaloMinimo(valor);
      setIntervaloUnidadeMin(unidade);
    } else {
      setIntervaloMaximo(valor);
      setIntervaloUnidadeMax(unidade);
    }
  };

  const handleTagSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setTagsSelecionadas(selectedOptions);
  };



  const insertVariable = (index, variable) => {
  const textarea = textAreasRef.current[index];
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const textoAtual = mensagens[index].text; 
  const novaMensagem = 
    textoAtual.slice(0, start) + `{{${variable.field_name}}}` + textoAtual.slice(end);

  const novasMensagens = [...mensagens];
  novasMensagens[index] = { ...mensagens[index], text: novaMensagem };
  setMensagens(novasMensagens);

  setTimeout(() => {
    const novaPos = start + `{{${variable.field_name}}}`.length;
    textarea.focus();
    textarea.setSelectionRange(novaPos, novaPos);
  }, 0);
};


  // Função para validar campos obrigatórios
  const validateFields = () => {
    const newErrors = {
      titulo: !titulo.trim(),
      canais: canais.length === 0,
      dataInicio: !dataInicio,
      horaInicio: !horaInicio,
      mensagens: mensagens.map(msg => !msg.text.trim()),
      funilSelecionado: tipoAlvo === 'Funil' && !funilSelecionado,
      etapa: tipoAlvo === 'Funil' && !etapa,
      tagsSelecionadas: tipoAlvo === 'Tag' && tagsSelecionadas.length === 0,
      etapaDestino: transferirContato && !etapaDestino,
      filaDestino: enviarParaFila && !filaDestino
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => 
      Array.isArray(error) ? error.some(e => e) : error
    );
  };

  const handleSave = async () => {
    if (loading) return;
    
    if (!validateFields()) {
      return;
    }
    setLoading(true);
    const start_date = dataInicio && horaInicio
      ? `${dataInicio}T${horaInicio}:00-03:00`
      : '';
      
    const mensagensParaSalvar = mensagens.map((msg, index) => {
  const imagem = mensagensImagens[index];

  const base = msg && typeof msg === 'object' && 'text' in msg
    ? msg
    : { text: msg, id: null };

  return {
    id: base.id || null,
    text: base.text,
    image: imagem ? limparBase64(imagem) : base.image || null,
  };
});


  const disparoData = {
    name: titulo,
    connection_id: canais, 
    sector: funilSelecionado.charAt(0).toLowerCase() + funilSelecionado.slice(1),
    kanban_stage: etapa,
    start_date,
    schema,
    tipoAlvo,
    ...(tipoAlvo === 'Funil' ? { etapa } : { tags: tagsSelecionadas }),
    mensagem: mensagensParaSalvar,
    intervalo: {
      timer: intervaloDinamico ? null : intervaloTempo,
      unidade: intervaloDinamico ? null : intervaloUnidade,
      min: intervaloDinamico ? intervaloMinimo : null,
      unidade_min: intervaloDinamico ? intervaloUnidadeMin : null,
      max: intervaloDinamico ? intervaloMaximo : null,
      unidade_max: intervaloDinamico ? intervaloUnidadeMax : null
    },
    transferir_contato: transferirContato,
    ...(transferirContato && etapaDestino ? { new_stage: etapaDestino } : {}),
    enviar_para_fila_unica: enviarParaFila,
    ...(enviarParaFila && filaDestino ? { queue_id: filaDestino } : {}),
    // Horário personalizado
    ...(!isDynamicTime && customTimeRange.startTime && customTimeRange.endTime ? {
      init_time: customTimeRange.startTime,
      end_time: customTimeRange.endTime
    } : {})
};

    try {
      const endpoint = `/campaing/create`;
      const response = await api.post(endpoint, {
        ...disparoData,
        ...(disparo ? { campaing_id: disparo.id } : {campaing_id: null})
      });
    console.log(response.data)
      
      if (response.status === 201) {
        if (!disparo) {
          showSuccess('Disparo criado com sucesso!');
        }
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('DisparoModal'));
        if (modal) {
          setTimeout(() => modal.hide(), 1200);
        }
        // Atualizar lista no componente pai
        if (onSave) {
          setTimeout(() => onSave(), 1200);
        }
        // Se for edição, resetar estados para permitir novas edições
        if (disparo) {
          setTimeout(() => {
            setLoading(false);
          }, 1300);
        } else {
          setLoading(false);
        }
        return;
      }
      setLoading(false);
      showError('Erro inesperado ao criar disparo.');
    } catch (error) {
      setLoading(false);
      if (error.response && error.response.data && error.response.data.erro) {
        showError(error.response.data.erro);
      } else {
        showError('Erro ao salvar disparo. Verifique os campos e tente novamente.');
      }
      console.error('Erro ao salvar disparo:', error);
    }
  };

  const variaveisFixas = [
  { id: 'contact_name', label: 'Nome', field_name: 'contact_name' },
  { id: 'contact_phone', label: 'Telefone', field_name: 'number' },
    ];

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
                Título *
              </label>
              <input
                type="text"
                className={`form-control input-${theme} ${errors.titulo ? 'border-danger' : ''}`}
                id="titulo"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  if (errors.titulo) {
                    setErrors(prev => ({ ...prev, titulo: false }));
                  }
                }}
                placeholder="Digite o título do disparo"
                disabled={!isAdmin}
                title={errors.titulo ? "Campo obrigatório" : ""}
              />
              {errors.titulo && (
                <div className="text-danger small mt-1">
                  Este campo é obrigatório
                </div>
              )}
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
              <div>

            <label htmlFor={`mensagem${index}`} className={`form-label card-subtitle-${theme}`}>
            Modelo de mensagem {index + 1} *
          </label>
              </div>

          {/* Container para textarea e preview da imagem lado a lado */}
          <div className="d-flex gap-3">
            {/* Preview da imagem ao lado da textarea */}
            {mensagensImagens[index] && (
              <div className="d-flex flex-column align-items-center">
                <img
                  src={mensagensImagens[index]}
                  alt={`Preview ${index}`}
                  className="rounded shadow-sm"
                  style={{ width: '128px', height: '128px', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Textarea */}
            <div className="flex-grow-1">
              <textarea
                ref={(el) => textAreasRef.current[index] = el}
                className={`form-control input-${theme} ${errors.mensagens[index] ? 'border-danger' : ''}`}
                id={`mensagem${index}`}
                value={mensagem.text}
                onChange={(e) => {
                  const novasMensagens = [...mensagens];
                  const mensagemAtual = mensagens[index];

                  novasMensagens[index] = {
                    ...mensagemAtual,         // mantém id, image e outros
                    text: e.target.value      // atualiza apenas o text
                  };

                  setMensagens(novasMensagens);
                  
                  // Limpar erro quando o usuário começar a digitar
                  if (errors.mensagens[index]) {
                    setErrors(prev => ({
                      ...prev,
                      mensagens: prev.mensagens.map((error, i) => i === index ? false : error)
                    }));
                  }
                }}
                rows="3"
                placeholder={`Digite a mensagem ${index + 1}`}
                title={errors.mensagens[index] ? "Campo obrigatório" : ""}
              />
            </div>
          </div>
  
    {/* Botões - Separados com divisor vertical */}
    <div className="mt-2 d-flex flex-row items-center gap-1">
      {/* Botão de imagem separado */}
      <button
        type="button"
        className={`btn btn-2-${theme}`}
        onClick={() => document.getElementById(`imageInput-${index}`).click()}
      >
        <i className="bi bi-image me-2"></i>
        Anexar Imagem
      </button>

      <input
        id={`imageInput-${index}`}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleImageUpload(e, index)}
      />

      {/* Divisor vertical */}
      <div 
        className="mx-2" 
        style={{ 
          width: '1px', 
          height: '24px', 
          backgroundColor: `var(--border-color-${theme})`,
          alignSelf: 'center' 
        }}
      ></div>

      {/* Botões de variáveis mapeadas */}
      <div className="d-flex gap-1">
        <p className={`card-subtitle-${theme} d-flex align-items-center me-2`}> Personalizados</p>
        {[...variaveisFixas, ...customFields].map((variable) => (
          <button
            key={variable.id}
            onClick={() => insertVariable(index, variable)}
            className={`btn btn-2-${theme}`}
          >
            {`${variable.label}`}
          </button>
        ))}
      </div>
    </div>
    
    {errors.mensagens[index] && (
      <div className="text-danger small mt-1">
        Este campo é obrigatório
      </div>
    )}
  </div>
))}

            {/* Grid de 2 colunas para Canal/Tipo e Data/Hora/Intervalo */}
            <div className="row">
              {/* Coluna da Esquerda */}
              <div className="col-6 d-flex flex-column justify-content-center">
                {/* Canais */}
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Canais *</label>
                  <div className={`d-flex flex-column gap-2 ${errors.canais ? 'border border-danger rounded p-2' : ''}`}>
                    {canais.map((canalId, idx) => (
                      <div key={idx} className="d-flex align-items-center gap-2">
                        <select
                          className={`form-select input-${theme}`}
                          value={canalId}
                          onChange={e => {
                            const novoId = e.target.value;
                            if (!canais.includes(novoId)) {
                              setCanais(prev => prev.map((id, i) => i === idx ? novoId : id));
                              if (errors.canais) {
                                setErrors(prev => ({ ...prev, canais: false }));
                              }
                            }
                          }}
                          disabled={!isAdmin}
                        >
                          <option value="">Selecione um canal</option>
                          {conexao.filter(conn => conn.id === canalId || !canais.includes(conn.id)).map(conn => (
                            <option key={conn.id} value={conn.id}>{conn.label || conn.name}</option>
                          ))}
                        </select>
                        {canais.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setCanais(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline-secondary mt-2"
                      onClick={() => {
                        // Adiciona o primeiro canal disponível não selecionado
                        const disponiveis = conexao.filter(conn => !canais.includes(conn.id));
                        if (disponiveis.length > 0) {
                          setCanais(prev => [...prev, disponiveis[0].id]); // SEM parseInt!
                          if (errors.canais) {
                            setErrors(prev => ({ ...prev, canais: false }));
                          }
                        }
                      }}
                      disabled={canais.length >= conexao.length || !isAdmin}
                    >
                      + Adicionar canal
                    </button>
                  </div>
                  {errors.canais && (
                    <div className="text-danger small mt-1">
                      Selecione pelo menos um canal
                    </div>
                  )}
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
                        className={`form-select input-${theme} ms-3 ${errors.funilSelecionado ? 'border-danger' : ''}`}
                        value={funilSelecionado}
                        onChange={(e) => {
                          setFunilSelecionado(e.target.value);
                          if (errors.funilSelecionado) {
                            setErrors(prev => ({ ...prev, funilSelecionado: false }));
                          }
                        }}
                        style={{ width: 'auto', minWidth: '200px' }}
                        title={errors.funilSelecionado ? "Campo obrigatório" : ""}
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
                      Etapa *
                    </label>
                    <select
                      className={`form-select input-${theme} ${errors.etapa ? 'border-danger' : ''}`}
                      id="etapa"
                      value={etapa}
                      onChange={(e) => {
                        setEtapa(e.target.value);
                        if (errors.etapa) {
                          setErrors(prev => ({ ...prev, etapa: false }));
                        }
                      }}
                      title={errors.etapa ? "Campo obrigatório" : ""}
                    >
                      <option value="" disabled>Selecione uma etapa</option>
                      {Array.isArray(etapas) && etapas.map((etapaObj) => (
                        <option key={etapaObj.id} value={etapaObj.id}>
                          {etapaObj.etapa}
                        </option>
                      ))}
                    </select>
                    {errors.etapa && (
                      <div className="text-danger small mt-1">
                        Este campo é obrigatório
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className={`form-label card-subtitle-${theme}`}>
                      Tags (Selecione uma ou mais) *
                    </label>
                    <div
                      className={`border rounded p-3 input-${theme} ${errors.tagsSelecionadas ? 'border-danger' : ''}`}
                      style={{
                        height: '140px',
                        overflowY: 'auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '10px'
                      }}
                      title={errors.tagsSelecionadas ? "Campo obrigatório" : ""}
                    >
                    </div>
                    {errors.tagsSelecionadas && (
                      <div className="text-danger small mt-1">
                        Selecione pelo menos uma tag
                      </div>
                    )}
                  </div>
                )}
                
                {/* Transferência de Contatos */}
                {tipoAlvo === 'Funil' && (
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="transferirContato"
                        checked={transferirContato}
                        onChange={(e) => {
                          setTransferirContato(e.target.checked);
                          if (!e.target.checked) {
                            setEtapaDestino('');
                            setErrors(prev => ({ ...prev, etapaDestino: false }));
                          }
                        }}
                      />
                      <label className={`form-check-label card-subtitle-${theme}`} htmlFor="transferirContato">
                        Transferir contato após disparo
                      </label>
                    </div>
                    
                    {transferirContato && (
                      <div className="mt-2">
                        <label htmlFor="etapaDestino" className={`form-label card-subtitle-${theme}`}>
                          Etapa de Destino *
                        </label>
                        <select
                          className={`form-select input-${theme} ${errors.etapaDestino ? 'border-danger' : ''}`}
                          id="etapaDestino"
                          value={etapaDestino}
                          onChange={(e) => {
                            setEtapaDestino(e.target.value);
                            if (errors.etapaDestino) {
                              setErrors(prev => ({ ...prev, etapaDestino: false }));
                            }
                          }}
                          title={errors.etapaDestino ? "Campo obrigatório" : ""}
                        >
                          <option value="" disabled>Selecione uma etapa de destino</option>
                          {Array.isArray(etapas) && etapas
                            .filter(etapaObj => etapaObj.id !== etapa) // Excluir a etapa atual
                            .map((etapaObj) => (
                              <option key={etapaObj.id} value={etapaObj.id}>
                                {etapaObj.etapa}
                              </option>
                            ))}
                        </select>
                        {errors.etapaDestino && (
                          <div className="text-danger small mt-1">
                            Este campo é obrigatório
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Enviar contatos para uma única fila */}
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="enviarParaFila"
                      checked={enviarParaFila}
                      onChange={(e) => {
                        setEnviarParaFila(e.target.checked);
                        if (!e.target.checked) {
                          setFilaDestino('');
                          setErrors(prev => ({ ...prev, filaDestino: false }));
                        }
                      }}
                    />
                    <label className={`form-check-label card-subtitle-${theme}`} htmlFor="enviarParaFila">
                      Enviar contatos para uma única fila
                    </label>
                  </div>

                  {enviarParaFila && (
                    <div className="mt-2">
                      <label htmlFor="filaDestino" className={`form-label card-subtitle-${theme}`}>
                        Fila de Destino *
                      </label>
                      <select
                        className={`form-select input-${theme} ${errors.filaDestino ? 'border-danger' : ''}`}
                        id="filaDestino"
                        value={filaDestino}
                        onChange={(e) => {
                          setFilaDestino(e.target.value);
                          if (errors.filaDestino) {
                            setErrors(prev => ({ ...prev, filaDestino: false }));
                          }
                        }}
                        title={errors.filaDestino ? "Campo obrigatório" : ""}
                      >
                        <option value="" disabled>Selecione uma fila</option>
                        {Array.isArray(filas) && filas.map((fila) => (
                          <option key={fila.id} value={fila.id}>
                            {fila.name}
                          </option>
                        ))}
                      </select>
                      {errors.filaDestino && (
                        <div className="text-danger small mt-1">
                          Este campo é obrigatório
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Coluna da Direita */}
              <div className="col-6">
                {/* Data de Início */}
                <div className="mb-3">
                  <label htmlFor="dataInicio" className={`form-label card-subtitle-${theme}`}>
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    className={`form-control input-${theme} ${errors.dataInicio ? 'border-danger' : ''}`}
                    id="dataInicio"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      if (errors.dataInicio) {
                        setErrors(prev => ({ ...prev, dataInicio: false }));
                      }
                    }}
                    title={errors.dataInicio ? "Campo obrigatório" : ""}
                  />
                  {errors.dataInicio && (
                    <div className="text-danger small mt-1">
                      Este campo é obrigatório
                    </div>
                  )}
                </div>
                {/* Hora de Início */}
                <div className="mb-3">
                  <label htmlFor="horaInicio" className={`form-label card-subtitle-${theme}`}>
                    Hora de Início *
                  </label>
                  <input
                    type="time"
                    className={`form-control input-${theme} ${errors.horaInicio ? 'border-danger' : ''}`}
                    id="horaInicio"
                    value={horaInicio}
                    onChange={(e) => {
                      setHoraInicio(e.target.value);
                      if (errors.horaInicio) {
                        setErrors(prev => ({ ...prev, horaInicio: false }));
                      }
                    }}
                    title={errors.horaInicio ? "Campo obrigatório" : ""}
                  />
                  {errors.horaInicio && (
                    <div className="text-danger small mt-1">
                      Este campo é obrigatório
                    </div>
                  )}
                </div>

                {/* Horário Personalizado */}
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Horário Personalizado</label>
                  
                  {/* Toggle para horário personalizado */}
                  <div className="mb-2">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="horarioPersonalizado"
                        checked={!isDynamicTime}
                        onChange={(e) => {
                          setIntervaloDinamico(false); // Desativa intervalo dinâmico ao ativar horário personalizado
                          setIsDynamicTime(!e.target.checked);
                          if (e.target.checked) {
                            // Resetar horários quando ativar
                            setCustomTimeRange({ startTime: '', endTime: '' });
                          }
                        }}
                      />
                      <label className={`form-check-label card-subtitle-${theme}`} htmlFor="horarioPersonalizado">
                        Definir horário de funcionamento
                      </label>
                    </div>
                  </div>

                  {!isDynamicTime && (
                    <div className="d-flex gap-2">
                      <input
                        type="time"
                        className={`form-control input-${theme}`}
                        value={customTimeRange.startTime}
                        onChange={e => setCustomTimeRange(prev => ({ ...prev, startTime: e.target.value }))}
                        placeholder="Início"
                      />
                      <input
                        type="time"
                        className={`form-control input-${theme}`}
                        value={customTimeRange.endTime}
                        onChange={e => setCustomTimeRange(prev => ({ ...prev, endTime: e.target.value }))}
                        placeholder="Fim"
                      />
                    </div>
                  )}
                </div>
                {/* Intervalo */}
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Intervalo</label>
                  
                  {/* Toggle para intervalo dinâmico */}
                  <div className="mb-2">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="intervaloDinamico"
                        checked={intervaloDinamico}
                        onChange={(e) =>{
                          setIsDynamicTime(true); // Desativa horário personalizado ao ativar intervalo dinâmico
                          setIntervaloDinamico(e.target.checked)}
                        } 
                          
                      />
                      <label className={`form-check-label card-subtitle-${theme}`} htmlFor="intervaloDinamico">
                        Dinâmico
                      </label>
                    </div>
                  </div>

                  {!intervaloDinamico ? (
                    /* Intervalo Fixo */
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
                  ) : (
                    /* Intervalo Dinâmico */
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex gap-2 align-items-center">
                        <label className={`form-label card-subtitle-${theme} mb-0`} style={{ minWidth: '80px' }}>
                          Mínimo:
                        </label>
                        <input
                          type="number"
                          className={`form-control input-${theme}`}
                          min="1"
                          value={ intervaloMinimo}
                          onChange={(e) => handleIntervaloDinamicoChange(parseInt(e.target.value) || 1, intervaloUnidadeMin, 'min')}
                          style={{ width: '100px' }}
                        />
                        <select
                          className={`form-select input-${theme}`}
                          value={intervaloUnidadeMin}
                          onChange={(e) => handleIntervaloDinamicoChange(intervaloMinimo, e.target.value, 'min')}
                        >
                          <option value="segundos">Segundos</option>
                          <option value="minutos">Minutos</option>
                          <option value="horas">Horas</option>
                        </select>
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        <label className={`form-label card-subtitle-${theme} mb-0`} style={{ minWidth: '80px' }}>
                          Máximo:
                        </label>
                        <input
                          type="number"
                          className={`form-control input-${theme}`}
                          min="1"
                          value={intervaloMaximo}
                          onChange={(e) => handleIntervaloDinamicoChange(parseInt(e.target.value) || 1, intervaloUnidadeMax, 'max')}
                          style={{ width: '100px' }}
                        />
                        <select
                          className={`form-select input-${theme}`}
                          value={intervaloUnidadeMax}
                          onChange={(e) => handleIntervaloDinamicoChange(intervaloMaximo, e.target.value, 'max')}
                        >
                          <option value="segundos">Segundos</option>
                          <option value="minutos">Minutos</option>
                          <option value="horas">Horas</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            {/* Remover todos os estados e lógicas de loading, success, errorMsg */}
            {/* Remover feedback visual do botão */}
            {/* Remover exibição de erro */}
            {/* Voltar handleSave para o formato original, sem loading/success/errorMsg */}
            {/* Botão volta ao texto padrão e habilitação padrão */}
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {disparo ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                disparo ? 'Salvar Alterações' : 'Criar Disparo'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisparoModal;