import React, { useState, useEffect, useMemo, useRef  } from 'react';
import * as bootstrap from 'bootstrap';
import DespesaModal from './modalPages/DespesaModal';
import ReceitasModal from './modalPages/ReceitasModal';
import { ExpensesService, CategoriesService, VendorsService } from '../services/FinanceiroService';
import { useToast } from '../contexts/ToastContext';
import axios from '../utils/axiosConfig';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Financeiro({ theme }) {
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('resumo');
  const [despesas, setDespesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [despesaEditando, setDespesaEditando] = useState(null);
  const [showReceitaModal, setShowReceitaModal] = useState(false);
  const [novaReceita, setNovaReceita] = useState({ 
    descricao: '', 
    itens: [{ id: 1, nome: '', valor: '' }],
    valorTotal: 0
  });
  const [receitas, setReceitas] = useState([]);
  const [excluindoReceita, setExcluindoReceita] = useState(null);
  const [filtros, setFiltros] = useState({
    busca: '',
    categoria: '',
    status: '',
    dataInicio: '',
    dataFim: '',
    categorizada: ''
  });
  const [days, setDays] = useState([])
  const datee = new Date
  // Mover a declaração do user e schema para o início
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = user.schema;
  
  // Funções para gerar dados do gráfico
  const generateLast7DaysLabels = () => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return labels;
  };


useEffect(()=>{
  const getLast7Dayss = async()=>{
    const date = new Date()
    const days = []
    for(let i=0; i<7; i++){
      const day = new Date(date)
      day.setDate(date.getDate()-i)
      days.push(day.toISOString().split('T')[0])
    }
    setDays(days)
  }
  getLast7Dayss()
},[])
  

  const generateLast6MonthsLabels = () => {
    const labels = [];
    const currentDate = new Date();
    
    // Adicionar os últimos 6 meses (passado)
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      labels.push(monthName);
    }
    
    // Adicionar os próximos 6 meses (futuro)
    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      labels.push(monthName);
    }
    
    return labels;
  };

  const generateDailyData = () => {
    const receitasData = [];
    const despesasData = [];
    const fluxoCaixaData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
        const receitasDoDia = receitas.filter(receita => 
          receita.due_date && receita.due_date.split('T')[0] === dateStr
        );
      const volumeReceitas = receitasDoDia.reduce((total, receita) => 
        total + (parseFloat(receita.total_amount) || 0), 0
      );
      
      
      // Calcular volume de despesas para o dia
      const despesasDoDia = despesas.filter(despesa => 
        despesa.expense?.date_incurred && despesa.expense.date_incurred.split('T')[0] === dateStr
      );
      const volumeDespesas = despesasDoDia.reduce((total, despesa) => 
        total + (parseFloat(despesa.expense?.total_amount) || 0), 0
      );
      
      receitasData.push(volumeReceitas);
      despesasData.push(volumeDespesas);
      fluxoCaixaData.push(volumeReceitas - volumeDespesas);
    }
    
    return { receitasData, despesasData, fluxoCaixaData };
  };

      const dailyData = useMemo(() => generateDailyData(), [receitas, despesas]);
  const performanceChartData = useMemo(() => ({
    labels: generateLast7DaysLabels(),
    datasets: [
      {
        label: 'Receitas (R$)',
        data: dailyData.receitasData,
        borderColor: theme === 'dark' ? 'rgb(34, 197, 94)' : 'rgb(34, 197, 94)',
        backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
        tension: 0.1,
        fill: true,
        pointBackgroundColor: theme === 'dark' ? 'rgb(34, 197, 94)' : 'rgb(34, 197, 94)',
        pointBorderColor: theme === 'dark' ? '#fff' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Despesas (R$)',
        data: dailyData.despesasData,
        borderColor: theme === 'dark' ? 'rgb(239, 68, 68)' : 'rgb(239, 68, 68)',
        backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.2)',
        tension: 0.1,
        fill: true,
        pointBackgroundColor: theme === 'dark' ? 'rgb(239, 68, 68)' : 'rgb(239, 68, 68)',
        pointBorderColor: theme === 'dark' ? '#fff' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Fluxo de Caixa (R$)',
        data: dailyData.fluxoCaixaData,
        borderColor: theme === 'dark' ? 'rgb(75, 192, 192)' : 'rgb(75, 192, 192)',
        backgroundColor: theme === 'dark' ? 'rgba(75, 192, 192, 0.1)' : 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
        pointBackgroundColor: theme === 'dark' ? 'rgb(75, 192, 192)' : 'rgb(75, 192, 192)',
        pointBorderColor: theme === 'dark' ? '#fff' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }), [dailyData, theme]);

  const generateSimulatedData = () => {
    // Dados simulados como fallback
    const baseValue = 20000; // R$ 20k como base
    const growthRates = [0.10, 0.0909, 0.0954, 0.0954, 0.0954, 0.0954]; // Taxas de crescimento simuladas
    
    const data = [];
    
    // Dados para os últimos 6 meses (passado) - simulando crescimento realista
    let currentValue = baseValue;
    for (let i = 0; i < 6; i++) {
      data.push(Math.round(currentValue));
      if (i < growthRates.length - 1) {
        currentValue = currentValue * (1 + growthRates[i]);
      }
    }

    
    // Calcular taxa média de crescimento dos meses passados
    const historicalGrowthRates = [];
    for (let i = 1; i < data.length; i++) {
      const previousValue = data[i - 1];
      const currentValue = data[i];
      const growthRate = (currentValue - previousValue) / previousValue;
      historicalGrowthRates.push(growthRate);
    }
    
    const averageGrowthRate = historicalGrowthRates.reduce((sum, rate) => sum + rate, 0) / historicalGrowthRates.length;
    
    // Dados para os próximos 6 meses (futuro) usando a taxa média calculada
    for (let i = 0; i < 6; i++) {
      const lastValue = data[data.length - 1];
      const projectedValue = lastValue * (1 + averageGrowthRate);
      data.push(Math.round(projectedValue));
    }
    
    // Garantir que temos exatamente 12 valores
    while (data.length < 12) {
      const lastValue = data[data.length - 1] || baseValue;
      data.push(Math.round(lastValue * (1 + averageGrowthRate)));
    }
    
    return data.slice(0, 12); // Retornar exatamente 12 valores
  };

  const generateMonthlyPerspectiveData = async () => {
    try {
      // Buscar dados reais dos últimos 6 meses
      const response = await axios.get(`${process.env.REACT_APP_URL}/receita/last-months-gain/6/${schema}`, { 
        withCredentials: true 
      });
      
      if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
        const historicalData = response.data.data;
        const historicalValues = historicalData.map(month => month.saldo || 0);
        
        // Se temos dados históricos, calcular taxa média de crescimento
        if (historicalValues.length > 1) {
          // Calcular taxas de crescimento entre meses consecutivos
          const growthRates = [];
          for (let i = 1; i < historicalValues.length; i++) {
            const previousValue = historicalValues[i - 1];
            const currentValue = historicalValues[i];
            
            if (previousValue > 0) {
              const growthRate = (currentValue - previousValue) / previousValue;
              growthRates.push(growthRate);
            }
          }
          
          // Calcular taxa média de crescimento
          const averageGrowthRate = growthRates.length > 0 
            ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
            : 0.1; // 10% padrão se não conseguir calcular
          
          
          const data = [...historicalValues];
          
          // Adicionar projeção para os próximos 6 meses usando a taxa média
          for (let i = 1; i <= 6; i++) {
            const lastValue = data[data.length - 1];
            const projectedValue = lastValue * (1 + averageGrowthRate);
            data.push(Math.round(projectedValue));
          }
          
          return data;
        }
      }
      
      // Se não temos dados suficientes, gerar dados únicos baseados no schema
      return generateUniqueData();
    } catch (error) {
      console.error('Erro ao buscar dados reais:', error);
      // Em caso de erro, gerar dados únicos
      return generateUniqueData();
    }
  };

  const generateUniqueData = () => {
    // Gerar dados únicos baseados no schema para garantir diferença
    const schemaHash = schema ? schema.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    const baseValue = 15000 + (schemaHash % 10000); // Valor base único por schema
    const growthRates = [0.08, 0.12, 0.15, 0.18, 0.20, 0.22]; // Taxas variáveis
    
    const data = [];
    
    // Dados para os últimos 6 meses (passado) - com valores únicos
    let currentValue = baseValue;
    for (let i = 0; i < 6; i++) {
      data.push(Math.round(currentValue));
      if (i < growthRates.length) {
        currentValue = currentValue * (1 + growthRates[i]);
      }
    }
    
    // Calcular taxa média de crescimento dos meses passados
    const historicalGrowthRates = [];
    for (let i = 1; i < data.length; i++) {
      const previousValue = data[i - 1];
      const currentValue = data[i];
      const growthRate = (currentValue - previousValue) / previousValue;
      historicalGrowthRates.push(growthRate);
    }
    
    const averageGrowthRate = historicalGrowthRates.reduce((sum, rate) => sum + rate, 0) / historicalGrowthRates.length;
    
    // Dados para os próximos 6 meses (futuro) usando a taxa média calculada
    for (let i = 0; i < 6; i++) {
      const lastValue = data[data.length - 1];
      const projectedValue = lastValue * (1 + averageGrowthRate);
      data.push(Math.round(projectedValue));
    }
    
    return data.slice(0, 12); // Retornar exatamente 12 valores
  };

  const [perspecChartData, setPerspecChartData] = useState({
    labels: generateLast6MonthsLabels(),
    datasets: [{
      label: 'Perspectiva de ganhos',
      data: generateUniqueData(), // Inicializar com dados únicos
      borderColor: theme === 'dark' ? 'rgb(255, 99, 132)' : 'rgb(255, 99, 132)',
      backgroundColor: theme === 'dark' ? 'rgba(255, 99, 132, 0.1)' : 'rgba(255, 99, 132, 0.2)',
      tension: 0.1,
      pointBackgroundColor: theme === 'dark' ? 'rgb(255, 99, 132)' : 'rgb(255, 99, 132)',
      pointBorderColor: theme === 'dark' ? '#fff' : '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  });

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: theme === 'dark' ? '#fff' : '#333',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: theme === 'dark' ? '#fff' : '#333',
        bodyColor: theme === 'dark' ? '#fff' : '#333',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `R$ ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#333',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#333',
          font: {
            size: 11
          },
          callback: function(value) {
            return `R$ ${value.toFixed(2)}`;
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }), [theme]);

  // Verificar se o schema está disponível
  useEffect(() => {
    if (!schema) {
      console.error('Schema não encontrado para o usuário:', user);
      showError('Erro: Schema do usuário não encontrado. Faça login novamente.');
    }
  }, [schema, user]);

  // Carregar dados reais para o gráfico de perspectiva
  useEffect(() => {
    const loadPerspectiveData = async () => {
      if (schema) {
        try {
          const data = await generateMonthlyPerspectiveData();
          
          if (data && data.length === 12) {
            setPerspecChartData(prev => ({
              ...prev,
              datasets: [{
                ...prev.datasets[0],
                data: data
              }]
            }));
          } else {
            // Se não temos 12 valores, usar dados únicos
            const uniqueData = generateUniqueData();
            setPerspecChartData(prev => ({
              ...prev,
              datasets: [{
                ...prev.datasets[0],
                data: uniqueData
              }]
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar dados de perspectiva:', error);
          // Em caso de erro, usar dados únicos
          const uniqueData = generateUniqueData();
          setPerspecChartData(prev => ({
            ...prev,
            datasets: [{
              ...prev.datasets[0],
              data: uniqueData
            }]
          }));
        }
      }
    };

    loadPerspectiveData();
  }, [schema]);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
      const tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));
      
      return () => {
        tooltipList.forEach(tooltip => {
          if (tooltip && tooltip._element) {
            tooltip.dispose();
          }
        });
      };
    }
  }, [activeTab]);

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // Carregar despesas
        const expensesResponse = await ExpensesService.getExpenses(schema);
        if (expensesResponse.success) {
          const despesasBasicas = expensesResponse.data || [];
          
          // Carregar dados completos de cada despesa (incluindo itens e taxas)
          const despesasCompletas = await Promise.all(
            despesasBasicas.map(async (despesa) => {
              try {
                const despesaCompleta = await ExpensesService.getExpenseById(despesa.id, schema);
                if (despesaCompleta.success) {
                  return despesaCompleta.data;
                }
                return despesa; // Fallback para dados básicos
              } catch (error) {
                console.error(`Erro ao carregar despesa ${despesa.id}:`, error);
                return despesa; // Fallback para dados básicos
              }
            })
          );
          
          setDespesas(despesasCompletas);
        }

        // Carregar categorias
        const categoriesResponse = await CategoriesService.getCategories(schema);
        if (categoriesResponse.success) {
          setCategorias(categoriesResponse.data || []);
        }

        // Carregar fornecedores
        const vendorsResponse = await VendorsService.getVendors(schema);
        if (vendorsResponse.success) {
          setFornecedores(vendorsResponse.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [schema]);



  // Funções de gestão de despesas
  const handleNovaDespesa = () => {
    setDespesaEditando(null);
    setShowDespesaModal(true);
  };

  const handleEditarDespesa = async (despesa) => {
    try {
      setLoading(true);
      // Buscar dados atualizados da despesa da API
      const response = await ExpensesService.getExpenseById(despesa.expense?.id || despesa.id, schema);
      if (response.success) {
        setDespesaEditando(response.data);
      } else {
        // Se falhar, usar os dados locais
        setDespesaEditando(despesa);
        showError('Erro ao carregar dados da despesa. Usando dados locais.');
      }
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      // Em caso de erro, usar os dados locais
      setDespesaEditando(despesa);
      showError('Erro ao carregar dados da despesa. Usando dados locais.');
    } finally {
      setLoading(false);
      setShowDespesaModal(true);
    }
  };

  const handleSalvarDespesa = async (despesa) => {
    try {
      setLoading(true);
      // Preparar dados para a API
      const expenseData = {
        user_id: user.id,
        vendor_id: despesa.fornecedor_id || null,
        description: despesa.descricao,
        category_id: despesa.categoria_id || null,
        total_amount: parseFloat(despesa.valor) || 0,
        currency: 'BRL',
        date_incurred: despesa.data,
        due_date: despesa.dataVencimento || null,
        payment_date: despesa.dataPagamento || null,
        payment_method: despesa.metodoPagamento || 'dinheiro',
        status: despesa.status || 'pendente',
        notes: despesa.observacoes || '',
        due_date: new Date().toISOString(),
        itens: despesa.itens,
        schema: schema
      };

      if (despesaEditando) {
        // Atualizar despesa existente
        const response = await ExpensesService.updateExpense(despesa.id, expenseData);
        if (response.success) {
          // Recarregar dados completos da despesa atualizada
          try {
            const despesaAtualizada = await ExpensesService.getExpenseById(despesa.id, schema);
            if (despesaAtualizada.success) {
              setDespesas(prev => prev.map(d => (d.expense?.id || d.id) === despesa.id ? despesaAtualizada.data : d));
            } else {
              // Fallback: usar dados da resposta de update
              setDespesas(prev => prev.map(d => (d.expense?.id || d.id) === despesa.id ? response.data : d));
            }
          } catch (error) {
            console.error('Erro ao recarregar despesa atualizada:', error);
            // Fallback: usar dados da resposta de update
            setDespesas(prev => prev.map(d => (d.expense?.id || d.id) === despesa.id ? response.data : d));
          }
          showSuccess('Despesa atualizada com sucesso!');
        } else {
          showError('Erro ao atualizar despesa. Tente novamente.');
        }
      } else {
        // Criar nova despesa
        const response = await ExpensesService.createExpense(expenseData);
        if (response.success) {
          // Recarregar dados completos da nova despesa
          try {
            const novaDespesa = await ExpensesService.getExpenseById(response.data.id, schema);
            if (novaDespesa.success) {
              setDespesas(prev => [...prev, novaDespesa.data]);
            } else {
              // Fallback: usar dados da resposta de criação
              setDespesas(prev => [...prev, response.data]);
            }
          } catch (error) {
            console.error('Erro ao recarregar nova despesa:', error);
            // Fallback: usar dados da resposta de criação
            setDespesas(prev => [...prev, response.data]);
          }
          showSuccess('Despesa criada com sucesso!');
        } else {
          showError('Erro ao criar despesa. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      showError('Erro ao salvar despesa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirDespesa = async (despesaId) => {
    if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        // Como não há endpoint de exclusão para despesas ainda, vamos apenas remover do estado local
        // TODO: Implementar endpoint de exclusão no backend
        setDespesas(prev => prev.filter(d => (d.expense?.id || d.id) !== despesaId));
        
        // Quando o endpoint estiver disponível, usar:
        /*
        const response = await fetch(`${process.env.REACT_APP_URL}/expenses/${despesaId}?schema=${schema}`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          setDespesas(prev => prev.filter(d => (d.expense?.id || d.id) !== despesaId));
        } else {
          showError('Erro ao excluir despesa. Tente novamente.');
        }
        */
      } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        showError('Erro ao excluir despesa. Tente novamente.');
      }
    }
  };

  // Funções de callback para atualizar listas quando novos itens são criados
  const handleCategoryCreated = (newCategory) => {
    setCategorias(prev => [...prev, newCategory]);
  };

  const handleVendorCreated = (newVendor) => {
    setFornecedores(prev => [...prev, newVendor]);
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const despesasFiltradas = despesas.filter(despesa => {
    const matchBusca = !filtros.busca || 
      despesa.expense?.description?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      despesa.vendor_name?.toLowerCase().includes(filtros.busca.toLowerCase());
    
    const matchCategoria = !filtros.categoria || despesa.category_name === filtros.categoria;
    const matchStatus = !filtros.status || despesa.expense?.status === filtros.status;
    const matchCategorizada = !filtros.categorizada || 
      (filtros.categorizada === 'categorizada' && despesa.category_name) ||
      (filtros.categorizada === 'nao_categorizada' && !despesa.category_name);
    
    const matchData = (!filtros.dataInicio || despesa.expense?.date_incurred >= filtros.dataInicio) &&
                     (!filtros.dataFim || despesa.expense?.date_incurred <= filtros.dataFim);
    
    return matchBusca && matchCategoria && matchStatus && matchCategorizada && matchData;
  });

  // Funções de exportação
  const exportarCSV = () => {
    const headers = ['ID', 'Descrição', 'Valor', 'Categoria', 'Data', 'Fornecedor', 'Status', 'Valor Total'];
    const csvContent = [
      headers.join(','),
      ...despesasFiltradas.map(d => [
        d.expense?.id || d.id,
        `"${d.expense?.description || d.description || ''}"`,
        d.expense?.total_amount || d.total_amount || '',
        d.category_name || 'Não categorizada',
        d.expense?.date_incurred || d.date_incurred || '',
        `"${d.vendor_name || ''}"`,
        d.expense?.status || d.status || '',
        d.expense?.total_amount || d.total_amount || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `despesas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportarExcel = () => {
    // Simulação de exportação Excel (usando CSV como base)
    exportarCSV();
  };

  const exportarPDF = () => {
    // Simulação de exportação PDF
    const conteudo = despesasFiltradas.map(d => 
      `${d.expense?.description || d.description || ''} - R$ ${d.expense?.total_amount || d.total_amount || ''} - ${d.expense?.date_incurred || d.date_incurred || ''}`
    ).join('\n');
    
    const blob = new Blob([conteudo], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `despesas_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  // Helpers de cálculo de impostos
  const parseNumber = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  // Função para calcular receitas do mês atual
  const calcularReceitasDoMes = () => {
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    return receitas.reduce((total, receita) => {
      if (receita.due_date) {
        const dataReceita = new Date(receita.due_date);
        if (dataReceita.getMonth() === mesAtual && dataReceita.getFullYear() === anoAtual) {
          return total + (parseFloat(receita.total_amount || receita.valor_receita || 0));
        }
      }
      return total;
    }, 0);
  };

  const calcularImpostosItem = (item) => {
    const unitPrice = parseNumber(item.unit_price || item.price || item.valor);
    const quantity = parseInt(item.quantity || item.qty || item.quantidade || 1);
    const taxes = Array.isArray(item.taxes) ? item.taxes : [];
    return taxes.reduce((sum, tax) => {
      const taxAmount = parseNumber(tax.tax_amount);
      if (taxAmount) return sum + taxAmount;
      const rate = parseNumber((tax.tax_rate && tax.tax_rate.rate) || tax.rate || tax.tax_rate_percentage);
      return sum + (unitPrice * quantity * rate) / 100;
    }, 0);
  };

  const calcularImpostosDespesa = (despesa) => {
    // Estruturas possíveis
    const expense = despesa.expense || despesa;
    const items = despesa.expense_items || despesa.items || expense?.items || [];
    const taxesRoot = despesa.tax_rates || despesa.taxes || [];

    const totalAmount = parseNumber(expense?.total_amount);

    // 1) Somar impostos por item (se existirem)
    const totalItemTaxes = items.reduce((acc, item) => acc + calcularImpostosItem(item), 0);
    const hasItemTaxes = items.some((it) => Array.isArray(it.taxes) && it.taxes.length > 0);

    // 2) Somar impostos de nível da despesa (aplicação total ou quando não temos item.taxes)
    const totalRootTaxes = Array.isArray(taxesRoot)
      ? taxesRoot.reduce((sum, tax) => {
          const taxAmount = parseNumber(tax.tax_amount);
          if (taxAmount) return sum + taxAmount;

          const aplicacao = tax.aplicacao || tax.application;
          const rate = parseNumber(tax.tax_rate_percentage || tax.rate || (tax.tax_rate && tax.tax_rate.rate));

          if (aplicacao === 'total' || (!tax.expense_item_id && !hasItemTaxes)) {
            // Aplica sobre o total da despesa
            return sum + (totalAmount * rate) / 100;
          }

          // Se imposto estiver vinculado a um item específico e não temos item.taxes, calcular por item
          if (tax.expense_item_id && !hasItemTaxes) {
            const item = items.find((it) => String(it.id) === String(tax.expense_item_id));
            if (item) {
              const unitPrice = parseNumber(item.unit_price || item.price || item.valor);
              const quantity = parseInt(item.quantity || item.qty || item.quantidade || 1);
              return sum + (unitPrice * quantity * rate) / 100;
            }
          }

          return sum;
        }, 0)
      : 0;

    return totalItemTaxes + totalRootTaxes;
  };

  const calcularTotais = () => {
  const date = new Date();
  const hojeISO = date.toISOString().split('T')[0];

  // Filtra uma vez só
  const despesasHoje = despesasFiltradas.filter(
    (d) => d.expense.date_incurred.split('T')[0] === hojeISO
  );

  // Soma total de hoje
  const totalHoje = despesasHoje.reduce(
    (acc, d) => acc + (parseFloat(d.expense?.total_amount) || 0),
    0
  );

  // Calcula totais gerais
  const totais = despesasFiltradas.reduce(
    (acc, despesa) => {
      const valorDespesa = parseFloat(despesa.expense?.total_amount) || 0;
      const valorImpostos = calcularImpostosDespesa(despesa);
      const totalMes = despesas.filter(d=>new Date(d.expense.date_incurred).getMonth() === new Date().getMonth()).reduce((total, despesa)=>total+parseFloat(despesa.expense?.total_amount) || 0, 0);
      return {
        total: acc.total + valorDespesa,
        totalHoje: totalHoje,
        totalMes: totalMes,
        base: acc.base + valorDespesa,
        impostos: acc.impostos + valorImpostos,
        categorizadas:
          acc.categorizadas + (despesa.category_name ? valorDespesa : 0),
        naoCategorizadas:
          acc.naoCategorizadas + (!despesa.category_name ? valorDespesa : 0),
      };
    },
    { total: 0, totalHoje: 0, base: 0, impostos: 0, categorizadas: 0, naoCategorizadas: 0 }
  );

  return totais;
};

  // Função para simular despesas vindas do WhatsApp (não categorizadas)
  const simularDespesaWhatsApp = () => {
    const despesaWhatsApp = {
      id: Date.now(),
      descricao: 'Despesa recebida via WhatsApp',
      valor: '150.00',
      categoria: '', // Não categorizada
      data: new Date().toISOString().split('T')[0],
      fornecedor: 'Fornecedor via WhatsApp',
      observacoes: 'Documento anexado via WhatsApp',
      status: 'pendente',
             documentos: [
         {
           id: Date.now(),
           nome: 'documento_whatsapp.pdf',
           tipo: 'application/pdf',
           tamanho: 1024000,
           dataUpload: new Date().toISOString(),
           valorSugerido: '150.00',
           origem: 'whatsapp'
         }
       ],
      impostos: [],
      itens: [],
      dataCriacao: new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
      totalImpostos: 0,
      totalItens: 0,
      valorTotal: 150.00,
      origem: 'whatsapp'
    };

    setDespesas(prev => [...prev, despesaWhatsApp]);
  };

  // Função para simular despesa com impostos
  const simularDespesaComImpostos = () => {
    const despesaComImpostos = {
      id: Date.now() + 1,
      descricao: 'Despesa com impostos',
      valor: '250.00',
      categoria: 'Serviços',
      data: new Date().toISOString().split('T')[0],
      fornecedor: 'Fornecedor com impostos',
      observacoes: 'Despesa com impostos para teste',
      status: 'pendente',
      documentos: [
        {
          id: Date.now() + 1,
          nome: 'nota_fiscal.pdf',
          tipo: 'application/pdf',
          tamanho: 1024000,
          dataUpload: new Date().toISOString(),
          valorSugerido: '250.00',
          origem: 'manual'
        }
      ],
      impostos: [
        {
          id: Date.now() + 2,
          tipo: 'ICMS',
          aliquota: 18,
          valorCalculado: 45.00,
          aplicacao: 'total',
          valorBase: 250.00
        },
        {
          id: Date.now() + 3,
          tipo: 'PIS',
          aliquota: 1.65,
          valorCalculado: 4.13,
          aplicacao: 'total',
          valorBase: 250.00
        }
      ],
      itens: [
        {
          id: Date.now() + 4,
          nome: 'Serviço de consultoria',
          valor: 200.00,
          quantidade: 1,
          observacoes: 'Serviço prestado'
        },
        {
          id: Date.now() + 5,
          nome: 'Material de escritório',
          valor: 50.00,
          quantidade: 1,
          observacoes: 'Material utilizado'
        }
      ],
      dataCriacao: new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
      totalImpostos: 49.13,
      totalItens: 250.00,
      valorTotal: 299.13,
      origem: 'manual'
    };

    setDespesas(prev => [...prev, despesaComImpostos]);
  };

  // Função para abrir modal de nova receita
  const handleNovaReceita = () => {
    setNovaReceita({ descricao: '', itens: [{ id: 1, nome: '', valor: '' }], valorTotal: 0 });
    setShowReceitaModal(true);
  };

  // Funções para gerenciar itens da receita
  const adicionarItemReceita = () => {
    const novoId = Math.max(...novaReceita.itens.map(item => item.id), 0) + 1;
    setNovaReceita(prev => ({
      ...prev,
      itens: [...prev.itens, { id: novoId, nome: '', valor: '' }]
    }));
  };

  const removerItemReceita = (id) => {
    if (novaReceita.itens.length > 1) {
      setNovaReceita(prev => ({
        ...prev,
        itens: prev.itens.filter(item => item.id !== id)
      }));
    }
  };

  const atualizarItemReceita = (id, campo, valor) => {
    setNovaReceita(prev => ({
      ...prev,
      itens: prev.itens.map(item => 
        item.id === id ? { ...item, [campo]: valor } : item
      )
    }));
  };

  const calcularValorTotalReceita = () => {
    const total = novaReceita.itens.reduce((soma, item) => {
      const valor = parseFloat(item.valor) || 0;
      return soma + valor;
    }, 0);
    
    setNovaReceita(prev => ({ ...prev, valorTotal: total }));
    return total;
  };

  // Calcular total sempre que os itens mudarem
  useEffect(() => {
    calcularValorTotalReceita();
  }, [novaReceita.itens]);

  // Carregar receitas quando o componente for montado
  useEffect(() => {
    if (schema) {
      carregarReceitas();
    }
  }, [schema]); // eslint-disable-line react-hooks/exhaustive-deps

  
  // Função para carregar receitas
  const carregarReceitas = async () => {
    try {
      const url = `${process.env.REACT_APP_URL}/receita/get-receitas/${schema}`;
      const response = await axios.get(url, { withCredentials: true });
      
      if (response.data && response.data.success) {
        const result = response.data;
        if (result.data) {
          
          // Para cada receita, buscar dados completos incluindo itens e impostos
          const receitasCompletas = [];
          for (const receita of result.data) {
            try {
              const receitaCompleta = await axios.get(`${process.env.REACT_APP_URL}/receita/get-receita/${receita.id}/${schema}`, {
                withCredentials: true
              });
              if (receitaCompleta.data && receitaCompleta.data.success && receitaCompleta.data.data) {
                const receitaData = receitaCompleta.data.data;
                receitasCompletas.push({
                  id: receitaData.receita?.id || receita.id,
                  nome: receitaData.receita?.name || receita.nome,
                  valor_receita: receitaData.receita.totalAmount || receita.valor_receita,
                  total_amount: receitaCompleta.data.data.receita.total_amount || receita.total_amount,
                  schema: receitaData.receita?.schema_name || receita.schema_name,
                  status: receitaData.receita?.status || receita.status,
                  due_date: receitaData.receita?.due_date || receita.due_date,
                  updated_at: receitaData.receita?.updated_at || receita.updated_at,
                  items: receitaData.items,
                  taxes: receitaData.taxes || [],
                  category_name: receitaData.category_name,
                  vendor_name: receitaData.vendor_name
                });
              } else {
                // Se não conseguir buscar dados completos, usar dados básicos
                receitasCompletas.push({
                  id: receita.id,
                  nome: receita.nome,
                  valor_receita: receita.valor_receita,
                  total_amount: receita.total_amount,
                  schema: receita.schema_name,
                  status: receita.status,
                  due_date: receita.due_date,
                  updated_at: receita.updated_at,
                  items: receita.items || [],
                  taxes: [],
                  category_name: null,
                  vendor_name: null
                });
              }
            } catch (error) {
              console.error(`Erro ao buscar dados completos da receita ${receita.id}:`, error);
              // Usar dados básicos em caso de erro
              receitasCompletas.push({
                id: receita.id,
                nome: receita.nome,
                valor_receita: receita.valor_receita,
                total_amount: receita.total_amount,
                schema: receita.schema_name,
                status: receita.status,
                                  due_date: receita.due_date,
                updated_at: receita.updated_at,
                items: receita.items || [],
                taxes: [],
                category_name: null,
                vendor_name: null
              });
            }
          }
          setReceitas(receitasCompletas);
        } else {
          console.error('Resposta da API não tem dados:', result);
        }
      } else {
        console.error('Resposta da API não tem sucesso:', response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      if (error.response) {
        console.error('Status do erro:', error.response.status);
        console.error('Dados do erro:', error.response.data);
      }
    }
  };

  // Função para salvar receita (formato antigo - mantida para compatibilidade)
  const handleSalvarReceita = async () => {
    try {
      if (!novaReceita.descricao || novaReceita.itens.length === 0) {
        showError('Preencha nome e adicione pelo menos um item à receita.');
        return;
      }

      // Validar se todos os itens têm nome e valor
      const itensValidos = novaReceita.itens.filter(item => item.nome.trim() && item.valor);
      if (itensValidos.length === 0) {
        showError('Todos os itens devem ter nome e valor preenchidos.');
        return;
      }

      if (itensValidos.length !== novaReceita.itens.length) {
        showError('Remova os itens vazios ou preencha todos os campos.');
        return;
      }
      
      
      const response = await axios.post(`${process.env.REACT_APP_URL}/receita/create-receita`,
        {
          nome: novaReceita.descricao, 
          valor_receita: novaReceita.valorTotal, 
          schema: schema
        }, 
        { withCredentials: true }
      );
      
      
      if (response.data && response.data.success) {
        const result = response.data;
        
        if (result.data) {
          // Mapear campos do banco para o frontend
          const receitaSalva = {
            id: result.data.id,
            nome: result.data.nome, // Campo do banco: nome
            valor_receita: result.data.valor_receita, // Campo do banco: valor_receita
            total_amount: result.data.total_amount, // Campo do banco: total_amount
            schema: result.data.schema_name,
            status: result.data.status,
            due_date: result.data.due_date,
            updated_at: result.data.updated_at,
            items: itensValidos // Incluir itens salvos
          };
          
          setReceitas(prev => [...prev, receitaSalva]);
          setNovaReceita({ descricao: '', itens: [{ id: 1, nome: '', valor: '' }], valorTotal: 0 });
          setShowReceitaModal(false);
          showSuccess('Receita salva com sucesso!');
        } else {
          throw new Error('Resposta inválida da API');
        }
      } else {
        throw new Error('Resposta da API não tem sucesso');
      }
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      if (error.response) {
        console.error('Status do erro:', error.response.status);
        console.error('Dados do erro:', error.response.data);
        showError(`Erro ao salvar receita: ${error.response.data?.message || error.response.data?.error || 'Erro desconhecido'}`);
      } else {
        showError('Erro ao salvar receita. Tente novamente.');
      }
    }
  };

  // Nova função para salvar receita do modal ReceitasModal
  const handleSaveReceita = async (receitaData) => {
    try {
      
      // Validar dados obrigatórios
      if (!receitaData.nome || !receitaData.nome.trim()) {
        showError('Por favor, preencha o nome da receita.');
        return;
      }
      
      if (!receitaData.valor_receita || parseFloat(receitaData.valor_receita) <= 0) {
        showError('Por favor, preencha um valor válido para a receita.');
        return;
      }
      
      if (!receitaData.data) {
        showError('Por favor, selecione uma data para a receita.');
        return;
      }

      // Preparar dados para a API
      const dadosReceita = {
        nome: receitaData.nome,
        valor_receita: receitaData.valor_receita,
        data: receitaData.data,
        observacoes: receitaData.observacoes || '',
        status: receitaData.status || 'pendente',
        itens: receitaData.itens || [],
        schema: receitaData.schema
      };

      
      let response;
      
      // Verificar se é edição ou criação
      if (receitaData.id) {
        // Atualizar receita existente
        response = await axios.put(`${process.env.REACT_APP_URL}/receita/update-receita/${receitaData.id}/${schema}`,
          dadosReceita,
          { withCredentials: true }
        );
      } else {
        // Criar nova receita
        response = await axios.post(`${process.env.REACT_APP_URL}/receita/create-receita`,
          dadosReceita,
          { withCredentials: true }
        );
      }
      
      
      if (response.data && response.data.success) {
        const result = response.data;
        
        if (result.data) {
          // Mapear campos do banco para o frontend
          const receitaSalva = {
            id: result.data.id,
            nome: result.data.nome,
            valor_receita: result.data.valor_receita,
            total_amount: result.data.total_amount,
            schema: result.data.schema_name,
            status: result.data.status,
            due_date: result.data.due_date,
            updated_at: result.data.updated_at,
            items: result.data.items || []
          };
          
          if (receitaData.id) {
            // Atualizar receita existente
            setReceitas(prev => prev.map(r => r.id === receitaData.id ? receitaSalva : r));
            showSuccess('Receita atualizada com sucesso!');
          } else {
            // Adicionar nova receita
            setReceitas(prev => [...prev, receitaSalva]);
            showSuccess('Receita criada com sucesso!');
          }
          
          
          // Recarregar lista de receitas
          await carregarReceitas();
        } else {
          throw new Error('Resposta inválida da API');
        }
      } else {
        throw new Error('Resposta da API não tem sucesso');
      }
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      if (error.response) {
        console.error('Status do erro:', error.response.status);
        console.error('Dados do erro:', error.response.data);
        showError(`Erro ao salvar receita: ${error.response.data?.message || error.response.data?.error || 'Erro desconhecido'}`);
      } else {
        showError('Erro ao salvar receita. Tente novamente.');
      }
    }
  };

  // Funções para gestão de receitas
  const handleEditarReceita = async (receita) => {
    try {
      // Buscar dados completos da receita incluindo itens e impostos
      const response = await axios.get(`${process.env.REACT_APP_URL}/receita/get-receita/${receita.id}/${schema}`, {
        withCredentials: true
      });
      if (response.data && response.data.success && response.data.data) {
        const receitaCompleta = response.data.data;
        
        // Para editar, precisamos carregar os itens existentes
        // Se não houver itens, criar um item padrão com os dados da receita
        const itensParaEditar = receitaCompleta.items && receitaCompleta.items.length > 0 
          ? receitaCompleta.items.map(item => ({ 
              id: item.id,
              descricao: item.item_name || item.item_desc || '',
              valor: Number(item.unit_price) || 0,
              quantidade: Number(item.quantity) || 1,
              observacoes: item.item_desc || ''
            }))
          : [{ 
              id: 1, 
              descricao: receitaCompleta.receita?.name || receitaCompleta.receita?.description || '', 
              valor: Number(receitaCompleta.receita?.valor_receita || receitaCompleta.receita?.total_amount || 0) || 0,
              quantidade: 1,
              observacoes: ''
            }];

        // Mapear impostos corretamente
        const impostosParaEditar = [];
        if (receitaCompleta.items && receitaCompleta.items.length > 0) {
          // Buscar todos os impostos disponíveis para mapear corretamente
          try {
            const taxRatesResponse = await axios.get(`${process.env.REACT_APP_URL}/expenses/get-tax-rates/${schema}`, {
              withCredentials: true
            });
            
            const taxRates = taxRatesResponse.data?.success ? taxRatesResponse.data.data : [];
            
            // Para cada item, buscar seus impostos
            for (const item of receitaCompleta.items) {
              if (item.taxes && Array.isArray(item.taxes)) {
                for (const tax of item.taxes) {
                  // Encontrar o imposto na lista de tax rates disponíveis
                  const taxRate = taxRates.find(tr => tr.id === (tax.tax_rate_id || tax.id));
                  
                  if (taxRate) {
                    impostosParaEditar.push({
                      id: taxRate.id, // UUID do imposto
                      tax_name: taxRate.name,
                      tax_rate_percentage: taxRate.rate,
                      tax_amount: tax.tax_amount || 0,
                      aplicacao: 'item',
                      expense_item_id: item.id,
                      itemId: item.id,
                      itemNome: item.item_name || item.item_desc || '',
                      observacoes: '',
                      valorCalculado: tax.tax_amount || 0
                    });
                  } else {
                    // Usar dados básicos do imposto se não conseguir mapear
                    impostosParaEditar.push({
                      id: tax.tax_rate_id || tax.id,
                      tax_name: 'Imposto',
                      tax_rate_percentage: 0,
                      tax_amount: tax.tax_amount || 0,
                      aplicacao: 'item',
                      expense_item_id: item.id,
                      itemId: item.id,
                      itemNome: item.item_name || item.item_desc || '',
                      observacoes: '',
                      valorCalculado: tax.tax_amount || 0
                    });
                  }
                }
              }
            }
          } catch (taxError) {
            console.error('Erro ao buscar tax rates:', taxError);
            // Em caso de erro, usar dados básicos dos impostos
            for (const item of receitaCompleta.items) {
              if (item.taxes && Array.isArray(item.taxes)) {
                for (const tax of item.taxes) {
                  impostosParaEditar.push({
                    id: tax.tax_rate_id || tax.id,
                    tax_name: 'Imposto',
                    tax_rate_percentage: 0,
                    tax_amount: tax.tax_amount || 0,
                    aplicacao: 'item',
                    expense_item_id: item.id,
                    itemId: item.id,
                    itemNome: item.item_name || item.item_desc || '',
                    observacoes: '',
                    valorCalculado: tax.tax_amount || 0
                  });
                }
              }
            }
          }
        }

        // Preparar dados para o modal
        const receitaParaEditar = {
          id: receitaCompleta.receita?.id || receita.id,
          descricao: receitaCompleta.receita?.name || receitaCompleta.receita?.description || '', 
          valor_receita: receitaCompleta.receita?.valor_receita || receitaCompleta.receita?.total_amount || 0,
          data: receitaCompleta.receita?.data ? new Date(receitaCompleta.receita.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          observacoes: receitaCompleta.receita?.notes || '',
          status: receitaCompleta.receita?.status || 'pendente',
          itens: itensParaEditar,
          impostos: impostosParaEditar
        };

        setNovaReceita(receitaParaEditar);
        setShowReceitaModal(true);
      } else {
        showError('Erro ao carregar dados da receita para edição');
      }
    } catch (error) {
      console.error('Erro ao carregar receita para edição:', error);
      showError('Erro ao carregar dados da receita para edição');
    }
  };

  const handleExcluirReceita = async (receitaId) => {
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        setExcluindoReceita(receitaId);
        
        
        // Chamar API para excluir receita
        const response = await axios.delete(`${process.env.REACT_APP_URL}/receita/delete-receita`, {
          data: {
            receita_id: receitaId,
            schema: schema
          },
          withCredentials: true
        });
        
        
        if (response.data && response.data.success) {
          // Remover do estado local apenas se a exclusão foi bem-sucedida
          setReceitas(prev => prev.filter(r => r.id !== receitaId));
          // Mostrar mensagem de sucesso
          showSuccess('Receita excluída com sucesso!');
          // Recarregar receitas para garantir sincronização
          setTimeout(() => {
            carregarReceitas();
          }, 1000);
        } else {
          console.error('Erro da API:', response.data);
          showError(`Erro ao excluir receita: ${response.data?.message || 'Tente novamente.'}`);
        }
      } catch (error) {
        console.error('Erro ao excluir receita:', error);
        if (error.response) {
          console.error('Status do erro:', error.response.status);
          console.error('Dados do erro:', error.response.data);
          showError(`Erro ao excluir receita: ${error.response.data?.message || error.response.data?.error || 'Erro desconhecido'}`);
        } else {
          showError('Erro ao excluir receita. Verifique sua conexão.');
        }
      } finally {
        setExcluindoReceita(null);
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumo':
        return (
          <div className="p-4">
            <h4 className={`header-text-${theme} mb-3`}>Resumo Financeiro</h4>
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-cash-coin text-success" style={{ fontSize: '2rem' }}></i>
                    <div className="ms-3">
                      <h6 className={`card-subtitle-${theme} mb-1`}>Receitas do Mês</h6>
                      <h4 className={`header-text-${theme} mb-0`}>R$ {calcularReceitasDoMes().toFixed(2)}</h4>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-cart-x text-danger" style={{ fontSize: '2rem' }}></i>
                    <div className="ms-3">
                      <h6 className={`card-subtitle-${theme} mb-1`}>Despesas do Mês</h6>
                      <h4 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().total.toFixed(2)}</h4>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-graph-up text-primary" style={{ fontSize: '2rem' }}></i>
                    <div className="ms-3">
                      <h6 className={`card-subtitle-${theme} mb-1`}>Saldo</h6>
                      <h4 className={`header-text-${theme} mb-0`}>R$ {(calcularReceitasDoMes() - calcularTotais().total).toFixed(2)}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-graph-up text-success" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Maior Entrada</h6>
                      <h5 className={`header-text-${theme} mb-0`}>
                        R$ {Math.max(...dailyData.fluxoCaixaData, 0).toFixed(2)}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-graph-down text-danger" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Maior Saída</h6>
                      <h5 className={`header-text-${theme} mb-0`}>
                        R$ {Math.abs(Math.min(...dailyData.fluxoCaixaData, 0)).toFixed(2)}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-calculator text-info" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Média Diária</h6>
                      <h5 className={`header-text-${theme} mb-0`}>
                        R$ {(dailyData.fluxoCaixaData.reduce((a, b) => a + b, 0) / dailyData.fluxoCaixaData.length).toFixed(2)}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-arrow-up-circle text-primary" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Dias Positivos</h6>
                      <h5 className={`header-text-${theme} mb-0`}>
                        {dailyData.fluxoCaixaData.filter(v => v > 0).length}/7
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <div className={`card card-${theme} p-3`}>
                  <h5 className={`header-text-${theme} mb-3`}>Fluxo de Caixa - Últimos 7 Dias</h5>
                  <div style={{ height: '300px', position: 'relative' }}>
                    <Line data={performanceChartData} options={chartOptions} />
                  </div>
                  <div className="mt-3">
                    <small className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                      <i className="bi bi-info-circle me-1"></i>
                      O gráfico mostra o fluxo de caixa diário (receitas - despesas) dos últimos 7 dias
                    </small>
                  </div>
                </div>
                <div className={`card card-${theme} p-3 mt-2`}>
                  <h5 className={`header-text-${theme} mb-3`}>Perspectiva de crescimento</h5>
                   <div style={{ height: '300px', position: 'relative' }}>
                    <Line data={perspecChartData} options={chartOptions} />
                  </div>
                  <div className="mt-3">
                    <small className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                      <i className="bi bi-info-circle me-1"></i>
                      O gráfico mostra a perspectiva de ganhos baseado no aumento do saldo durantes os últimos meses
                    </small>
                    </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'despesas':
        return (
          <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className={`header-text-${theme} mb-0`}>Gestão de Despesas</h4>
                             <div className="d-flex gap-2">
                 <button className={`btn btn-2-${theme}`} onClick={simularDespesaWhatsApp}>
                   <i className="bi bi-whatsapp me-2"></i>
                   Simular WhatsApp
                 </button>
                 <button className={`btn btn-2-${theme}`} onClick={simularDespesaComImpostos}>
                   <i className="bi bi-calculator me-2"></i>
                   Simular com Impostos
                 </button>
                 <button className={`btn btn-1-${theme}`} onClick={handleNovaDespesa}>
                   <i className="bi bi-plus-circle me-2"></i>
                   Nova Despesa
                 </button>
               </div>
            </div>
            
                         {/* Cards de métricas */}
             <div className="row mb-3">
               <div className="col-md-4">
                 <div className={`card card-${theme} p-3`}>
                   <div className="row">
                                          <div className="col-6">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-tag" style={{ fontSize: '1.5rem', color: `var(--primary-color)` }}></i>
                          <div className="ms-2">
                            <h6 className={`card-subtitle-${theme} mb-0`}>Categorizadas</h6>
                            <h5 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().categorizadas.toFixed(2)}</h5>
                          </div>
                        </div>
                      </div>
                      <div className="col-6" style={{ borderLeft: `1px solid var(--border-color-${theme})` }}>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-question-circle" style={{ fontSize: '1.5rem', color: `var(--primary-color)` }}></i>
                          <div className="ms-2">
                            <h6 className={`card-subtitle-${theme} mb-0`}>Não Categorizadas</h6>
                            <h5 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().naoCategorizadas.toFixed(2)}</h5>
                          </div>
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
                              <div className="col-md-2">
                  <div className={`card card-${theme} p-3`}>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-calendar-event" style={{ fontSize: '1.5rem', color: `var(--primary-color)` }}></i>
                      <div className="ms-2">
                        <h6 className={`card-subtitle-${theme} mb-0`}>Este Mês</h6>
                        <h5 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().totalMes.toFixed(2)}</h5>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className={`card card-${theme} p-3`}>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-calendar-day" style={{ fontSize: '1.5rem', color: `var(--primary-color)` }}></i>
                      <div className="ms-2">
                        <h6 className={`card-subtitle-${theme} mb-0`}>Hoje</h6>
                        <h5 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().totalHoje.toFixed(2)}</h5>
                      </div>
                    </div>
                  </div>
                </div>
               <div className="col-md-2">
                 <div className={`card card-${theme} p-3`}>
                   <div className="d-flex align-items-center">
                     <i className="bi bi-calculator text-danger" style={{ fontSize: '1.5rem' }}></i>
                     <div className="ms-2">
                       <h6 className={`card-subtitle-${theme} mb-0`}>Impostos</h6>
                       <h5 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().impostos.toFixed(2)}</h5>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="col-md-2">
                 <div className={`card card-${theme} p-3`}>
                   <div className="d-flex align-items-center">
                     <i className="bi bi-cart-x text-danger" style={{ fontSize: '1.5rem' }}></i>
                     <div className="ms-2">
                       <h6 className={`card-subtitle-${theme} mb-0`}>Total</h6>
                       <h5 className={`header-text-${theme} mb-0`}>R$ {calcularTotais().total.toFixed(2)}</h5>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

                         {/* Filtros avançados */}
             <div className={`card card-${theme} mb-3`}>
               <div className="card-header">
                 <h6 className={`header-text-${theme} mb-0`}>Filtros</h6>
               </div>
               <div className={`card-body bg-form-${theme}`}>
                <div className="row">
                                     <div className="col-md-3 mb-2">
                     <input 
                       type="text" 
                       className={`form-control input-${theme}`}
                       placeholder="Buscar despesas..."
                       value={filtros.busca}
                       onChange={(e) => handleFiltroChange('busca', e.target.value)}
                     />
                   </div>
                                     <div className="col-md-2 mb-2">
                                         <select 
                      className={`form-select input-${theme}`}
                      value={filtros.categoria}
                      onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                    >
                      <option value="">Todas as Categorias</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.name}>
                          {categoria.name}
                        </option>
                      ))}
                    </select>
                   </div>
                   <div className="col-md-2 mb-2">
                     <select 
                       className={`form-select input-${theme}`}
                       value={filtros.status}
                       onChange={(e) => handleFiltroChange('status', e.target.value)}
                     >
                       <option value="">Todos os Status</option>
                       <option value="pendente">Pendente</option>
                       <option value="pago">Pago</option>
                       <option value="cancelado">Cancelado</option>
                     </select>
                   </div>
                   <div className="col-md-2 mb-2">
                     <select 
                       className={`form-select input-${theme}`}
                       value={filtros.categorizada}
                       onChange={(e) => handleFiltroChange('categorizada', e.target.value)}
                     >
                       <option value="">Todas</option>
                       <option value="categorizada">Categorizadas</option>
                       <option value="nao_categorizada">Não Categorizadas</option>
                     </select>
                   </div>
                  <div className="col-md-3 mb-2">
                    <div className="row">
                                             <div className="col-6">
                                                    <input 
                             type="date" 
                             className={`form-control input-${theme}`}
                             placeholder="Data início"
                             value={filtros.dataInicio}
                             onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                           />
                       </div>
                       <div className="col-6">
                                                    <input 
                             type="date" 
                             className={`form-control input-${theme}`}
                             placeholder="Data fim"
                             value={filtros.dataFim}
                             onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                           />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de despesas */}
            <div className={`card card-${theme}`}>
              <div className="card-header d-flex justify-content-between align-items-center" style={{ padding: '16px 20px' }}>
                <div className="d-flex align-items-center">
                  <h5 className={`header-text-${theme} mb-0`}>
                    Lista de Despesas ({despesasFiltradas.length})
                  </h5>
                  {loading && (
                    <div className="ms-2">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="dropdown">
                    <button className={`btn btn-sm btn-2-${theme} dropdown-toggle`} type="button" data-bs-toggle="dropdown">
                      <i className="bi bi-download me-1"></i>
                      Exportar
                    </button>
                    <ul className={`dropdown-menu dropdown-menu-${theme}`}>
                      <li><button className="dropdown-item" onClick={exportarCSV}>CSV</button></li>
                      <li><button className="dropdown-item" onClick={exportarExcel}>Excel</button></li>
                      <li><button className="dropdown-item" onClick={exportarPDF}>PDF</button></li>
                    </ul>
                  </div>
                                     <div className={`card card-${theme} py-2 px-3 gap-2`} style={{ minWidth: '150px' }}>
                     <div className="d-flex align-items-center justify-content-between gap-3">
                       <small className={`text-${theme === 'light' ? 'muted' : 'light'}`} style={{ fontSize: '1rem', fontWeight: '500' }}>
                         Total
                       </small>
                       <div className={`header-text-${theme}`} style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                         R$ {calcularTotais().total.toFixed(2)}
                       </div>
                     </div>
                   </div>
                </div>
              </div>
              <div className="card-body p-0">
                {despesasFiltradas.length > 0 ? (
                  <div className="table-responsive">
                                         <table className={`table custom-table-${theme} mb-0`}>
                                                                                                                          <thead>
                            <tr>
                              <th className={`header-text-${theme}`} style={{ width: '12%' }}>Data</th>
                              <th className={`header-text-${theme}`} style={{ width: '25%' }}>Descrição</th>
                              <th className={`header-text-${theme}`} style={{ width: '10%', textAlign: 'center' }}>Status</th>
                              <th className={`header-text-${theme}`} style={{ width: '12%', textAlign: 'center' }}>Categoria</th>
                              <th className={`header-text-${theme}`} style={{ width: '15%', textAlign: 'center' }}>Documentos</th>
                              <th className={`header-text-${theme}`} style={{ width: '15%' }}>Valor</th>
                              <th className={`header-text-${theme}`} style={{ width: '11%', textAlign: 'center' }}>Ações</th>
                            </tr>
                          </thead>
                         <tbody>
                            {despesasFiltradas.map((despesa, index) => {
                              // Verificar se a despesa tem a estrutura esperada
                              if (!despesa || !despesa.expense) {
                                console.warn('Despesa sem estrutura esperada:', despesa);
                                return null;
                              }
                              
                              return (
                                <tr key={despesa.expense.id || despesa.id || index}>
                                  <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                                    {despesa.expense.date_incurred ? 
                                      new Date(despesa.expense.date_incurred).toLocaleDateString('pt-BR') : 
                                      'Data não informada'
                                    }
                                  </td>
                                  <td>
                                   <div>
                                     <strong className={`header-text-${theme}`}>{despesa.expense.description || 'Sem descrição'}</strong>
                                     {despesa.vendor_name && (
                                       <small className={`text-${theme === 'light' ? 'muted' : 'light'} d-block`}>
                                         {despesa.vendor_name}
                                       </small>
                                     )}
                                   </div>
                                 </td>
                                                                                                 <td style={{ textAlign: 'center' }}>
                                     <span className={`badge bg-${
                                       despesa.expense.status === 'pago' ? 'success' : 
                                       despesa.expense.status === 'pendente' ? 'warning' : 'danger'
                                     }`} style={{ 
                                       textTransform: 'capitalize',
                                       fontWeight: '500',
                                       fontSize: '0.8rem',
                                       padding: '6px 10px'
                                     }}>
                                       {despesa.expense.status || 'pendente'}
                                     </span>
                                   </td>
                                                                   <td style={{ textAlign: 'center' }}>
                                     {despesa.category_name ? (
                                       <span className={`badge bg-success`}>{despesa.category_name}</span>
                                     ) : (
                                       <span className={`badge bg-warning`}>Não categorizada</span>
                                     )}
                                   </td>
                                <td style={{ textAlign: 'center' }}>
                                   <div className="d-flex align-items-center justify-content-center gap-1">
                                     {despesa.expense.documentos && despesa.expense.documentos.length > 0 && (
                                       <span className="badge bg-info">
                                         <i className="bi bi-file-earmark me-1"></i>
                                         {despesa.expense.documentos.length}
                                       </span>
                                     )}
                                     {despesa.documentos && despesa.documentos.some(doc => doc.valorSugerido) && (
                                       <span className="badge bg-warning" title="Valor sugerido dos documentos">
                                         <i className="bi bi-currency-dollar me-1"></i>
                                         R$ {despesa.documentos.reduce((total, doc) => total + (parseFloat(doc.valorSugerido) || 0), 0).toFixed(2)}
                                       </span>
                                     )}
                                     {despesa.origem === 'whatsapp' && (
                                       <span className="badge bg-success" title="Recebida via WhatsApp">
                                         <i className="bi bi-whatsapp"></i>
                                       </span>
                                     )}
                                     {!despesa.documentos?.length && despesa.origem !== 'whatsapp' && (
                                       <span className={`text-${theme === 'light' ? 'muted' : 'light'}`}>-</span>
                                     )}
                                   </div>
                                 </td>
                                                               <td>
                                  <div>
                                    <strong className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                                      R$ {parseFloat(despesa.expense.total_amount || 0).toFixed(2)}
                                    </strong>
                                  </div>
                                </td>
                                                               <td style={{ textAlign: 'center' }}>
                                   <button
                                     className={`icon-btn btn-2-${theme} btn-user`}
                                     data-bs-toggle="tooltip"
                                     title="Editar"
                                     onClick={() => handleEditarDespesa(despesa)}
                                   >
                                     <i className="bi bi-pencil-fill"></i>
                                   </button>
   
                                   <button
                                     className="icon-btn text-danger"
                                     data-bs-toggle="tooltip"
                                     title="Excluir"
                                     onClick={() => handleExcluirDespesa(despesa.expense?.id || despesa.id)}
                                   >
                                     <i className="bi bi-trash-fill"></i>
                                   </button>
                                 </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <i className="bi bi-receipt" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                    <p className={`text-${theme === 'light' ? 'muted' : 'light'} mt-2`}>
                      {despesas.length === 0 ? 'Nenhuma despesa registrada' : 'Nenhuma despesa encontrada com os filtros aplicados'}
                    </p>
                    {despesas.length === 0 && (
                      <button className={`btn btn-1-${theme}`} onClick={handleNovaDespesa}>
                        <i className="bi bi-plus-circle me-2"></i>
                        Adicionar Primeira Despesa
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'receitas':
        return (
          <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className={`header-text-${theme} mb-0`}>Gestão de Receitas</h4>
              <button className={`btn btn-1-${theme}`} onClick={handleNovaReceita}>
                <i className="bi bi-plus-circle me-2"></i>
                Nova Receita
              </button>
            </div>
            
            <div className="row mb-3">
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-cash-coin text-success" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Total Receitas</h6>
                      <h5 className={`header-text-${theme} mb-0`}>R$ {receitas.reduce((total, receita) => total + (parseFloat(receita.total_amount) || 0), 0).toFixed(2)}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-calendar-event text-info" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Este Mês</h6>
                      <h5 className={`header-text-${theme} mb-0`}>R$ {receitas.filter(r=>new Date(r.due_date).getMonth()===datee.getMonth() ).reduce((total, receita) => total + (parseFloat(receita.total_amount) || 0), 0).toFixed(2)}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-calendar-week text-warning" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Esta Semana</h6>
                      <h5 className={`header-text-${theme} mb-0`}>R$ {receitas.filter(r=>days.includes(r.due_date.split('T')[0])).reduce((total, receita) => total + (parseFloat(receita.total_amount) || 0), 0).toFixed(2)}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card card-${theme} p-3`}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-calendar-day text-success" style={{ fontSize: '1.5rem' }}></i>
                    <div className="ms-2">
                      <h6 className={`card-subtitle-${theme} mb-0`}>Hoje</h6>
                      <h5 className={`header-text-${theme} mb-0`}>R$ {receitas.filter(r=>r.due_date.split('T')[0]===datee.toISOString().split('T')[0]).reduce((total, receita) => total + (parseFloat(receita.total_amount) || 0), 0).toFixed(2)}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`card card-${theme}`}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className={`header-text-${theme} mb-0`}>Lista de Receitas</h5>
                <div className="d-flex gap-2">
                  <input 
                    type="text" 
                    className={`form-control form-control-${theme}`}
                    placeholder="Buscar receitas..."
                    style={{ width: '200px' }}
                  />
                  <select className={`form-select form-select-${theme}`} style={{ width: '150px' }}>
                    <option>Todas as Categorias</option>
                    <option>Vendas</option>
                    <option>Serviços</option>
                    <option>Investimentos</option>
                    <option>Outros</option>
                  </select>
                </div>
              </div>
              <div className="card-body">
                {receitas.length > 0 ? (
                  <div className="table-responsive">
                    <table className={`table custom-table-${theme} mb-0`}>
                      <thead>
                        <tr>
                          <th className={`header-text-${theme}`}>Descrição</th>
                          <th className={`header-text-${theme}`}>Itens</th>
                          <th className={`header-text-${theme}`}>Valor</th>
                          <th className={`header-text-${theme}`}>Data</th>
                          <th className={`header-text-${theme}`}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receitas.map((receita, index) => (
                          <tr key={receita.id || index}>
                            <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                              <strong>{receita.nome}</strong>
                            </td>
                            <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                              {receita.items && receita.items.length > 0 ? (
                                <div>
                                  {receita.items.map((item, idx) => (
                                    <div key={idx} className="small">
                                      {item.quantity}                                       {item.item_name}: R$ {parseFloat(item.unit_price || 0).toFixed(2)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                              <strong>R$ {parseFloat(receita.total_amount || 0).toFixed(2)}</strong>
                            </td>
                            <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                              {receita.due_date ? new Date(receita.due_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                            </td>
                            <td>
                              <button
                                className={`icon-btn btn-2-${theme} btn-user`}
                                data-bs-toggle="tooltip"
                                title="Editar"
                                onClick={() => handleEditarReceita(receita)}
                                disabled={excluindoReceita === receita.id}
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button
                                className="icon-btn text-danger"
                                data-bs-toggle="tooltip"
                                title={excluindoReceita === receita.id ? "Excluindo..." : "Excluir"}
                                onClick={() => handleExcluirReceita(receita.id || index)}
                                disabled={excluindoReceita === receita.id}
                              >
                                {excluindoReceita === receita.id ? (
                                  <div className="spinner-border spinner-border-sm" role="status">
                                    <span className="visually-hidden">Excluindo...</span>
                                  </div>
                                ) : (
                                  <i className="bi bi-trash"></i>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <i className="bi bi-cash-stack" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                    <p className={`text-${theme === 'light' ? 'muted' : 'light'} mt-2`}>Nenhuma receita registrada</p>
                    <button className={`btn btn-1-${theme}`} onClick={handleNovaReceita}>
                      <i className="bi bi-plus-circle me-2"></i>
                      Adicionar Primeira Receita
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  {showReceitaModal && (
  <div className="modal show d-block" tabIndex="-1">
    <div className="modal-dialog">
      <div className={`modal-content bg-form-${theme}`}>
        <div className="modal-header">
          <h5 className="modal-title">Nova Receita</h5>
          <button type="button" className="btn-close" onClick={() => setShowReceitaModal(false)}></button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            className={`form-control mb-2 input-${theme}`}
            placeholder="Nome da receita"
            value={novaReceita.descricao}
            onChange={e => setNovaReceita({ ...novaReceita, descricao: e.target.value })}
          />
          <input
            type="number"
            className={`form-control mb-2 input-${theme}`}
            placeholder="Valor"
            value={novaReceita.valor}
            onChange={e => setNovaReceita({ ...novaReceita, valor: e.target.value })}
          />
        </div>
        <div className="modal-footer">
          <button className={`btn btn-primary`} onClick={handleSalvarReceita}>Salvar</button>
        </div>
      </div>
    </div>
  </div>
)}
  return (
    <div className="pt-3" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="container-fluid ps-2 pe-0" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 className={`mb-3 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Financeiro</h2>
        <ul 
          className="nav nav-tabs ps-3"
          style={{
            borderBottom: 'none',
          }}
        >
          <li className="nav-item">
            <button
              className={`nav-link${activeTab === 'resumo' ? ' active' : ''}`}
              onClick={() => setActiveTab('resumo')}
              type="button"
              style={{
                transition: 'var(--TT) all',
                backgroundColor: 'transparent',
                border: `1px solid var(--border-color-${theme})`,
                borderTop: activeTab === 'resumo' ? `1px solid var(--primary-color)` : `1px solid var(--border-color-${theme})`,
                position: 'relative',
                paddingTop: activeTab === 'resumo' ? '0.5rem' : undefined,
                color: `var(--color-${theme})`,
                fontWeight: activeTab === 'resumo' ? 600 : 400,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.transition = 'var(--TT) all'}
              onBlur={e => e.currentTarget.style.transition = 'var(--TT) all'}
            >
              {activeTab === 'resumo' && (
                <span
                  style={{
                    transition: 'var(--TT) all',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '0',
                    borderTop: '5px solid var(--primary-color)',
                    borderRadius: '6px 6px 0 0',
                    pointerEvents: 'none',
                  }}
                ></span>
              )}
              Resumo
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${activeTab === 'despesas' ? ' active' : ''}`}
              onClick={() => setActiveTab('despesas')}
              type="button"
              style={{
                transition: 'var(--TT) all',
                backgroundColor: 'transparent',
                border: `1px solid var(--border-color-${theme})`,
                borderTop: activeTab === 'despesas' ? `1px solid var(--primary-color)` : `1px solid var(--border-color-${theme})`,
                position: 'relative',
                paddingTop: activeTab === 'despesas' ? '0.5rem' : undefined,
                color: `var(--color-${theme})`,
                fontWeight: activeTab === 'despesas' ? 600 : 400,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.transition = 'var(--TT) all'}
              onBlur={e => e.currentTarget.style.transition = 'var(--TT) all'}
            >
              {activeTab === 'despesas' && (
                <span
                  style={{
                    transition: 'var(--TT) all',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '0',
                    borderTop: '5px solid var(--primary-color)',
                    borderRadius: '6px 6px 0 0',
                    pointerEvents: 'none',
                  }}
                ></span>
              )}
              Despesas
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${activeTab === 'receitas' ? ' active' : ''}`}
              onClick={() => setActiveTab('receitas')}
              type="button"
              style={{
                transition: 'var(--TT) all',
                backgroundColor: 'transparent',
                border: `1px solid var(--border-color-${theme})`,
                borderTop: activeTab === 'receitas' ? `1px solid var(--primary-color)` : `1px solid var(--border-color-${theme})`,
                position: 'relative',
                paddingTop: activeTab === 'receitas' ? '0.5rem' : undefined,
                color: `var(--color-${theme})`,
                fontWeight: activeTab === 'receitas' ? 600 : 400,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.transition = 'var(--TT) all'}
              onBlur={e => e.currentTarget.style.transition = 'var(--TT) all'}
            >
              {activeTab === 'receitas' && (
                <span
                  style={{
                    transition: 'var(--TT) all',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '0',
                    borderTop: '5px solid var(--primary-color)',
                    borderRadius: '6px 6px 0 0',
                    pointerEvents: 'none',
                  }}
                ></span>
              )}
              Receitas
            </button>
          </li>
        </ul>
        <div className="pt-3" style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', border: `1px solid var(--border-color-${theme})`, borderRadius: '6px' }}>
          {renderTabContent()}
        </div>
      </div>

      {/* Modal de Despesa */}
      <DespesaModal
        show={showDespesaModal}
        onHide={() => setShowDespesaModal(false)}
        theme={theme}
        despesa={despesaEditando}
        onSave={handleSalvarDespesa}
        categorias={categorias}
        fornecedores={fornecedores}
        onCategoryCreated={handleCategoryCreated}
        onVendorCreated={handleVendorCreated}
      />

      {/* Modal de Receita */}
      <ReceitasModal
        show={showReceitaModal}
        onHide={() => setShowReceitaModal(false)}
        theme={theme}
        receita={novaReceita}
        onSave={handleSaveReceita}
      />
    </div>
  );
}

export default Financeiro; 