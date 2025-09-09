import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_URL;

// Configurar axios para sempre enviar cookies
axios.defaults.withCredentials = true;

// Serviço para Expenses
export const ExpensesService = {
  // Buscar todas as despesas
  getExpenses: async (schema) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expenses/get-expenses/${schema}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      throw error;
    }
  },

  // Criar nova despesa
  createExpense: async (expenseData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/expenses/create-expense`, expenseData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      throw error;
    }
  },

  // Buscar despesa por ID
  getExpenseById: async (expenseId, schema) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expenses/get-expense/${expenseId}/${schema}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar despesa por ID:', error);
      throw error;
    }
  },

  // Excluir despesa
  deleteExpense: async (expenseId, schema) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/expenses/delete-expense`, {
        data: { expense_id: expenseId, schema }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      throw error;
    }
  },

  // Buscar item de despesa por ID
  getExpenseItemById: async (itemId, schema) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expenses/get-expense-item/${itemId}/${schema}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar item de despesa por ID:', error);
      throw error;
    }
  },

  // Atualizar despesa existente
  updateExpense: async (expenseId, expenseData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/expenses/update-expense/${expenseId}`, expenseData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      throw error;
    }
  }
};

// Serviço para Categories
export const CategoriesService = {
  // Buscar todas as categorias
  getCategories: async (schema) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/category/get-categories/${schema}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  },

  // Criar nova categoria
  createCategory: async (categoryData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/category/create-category`, categoryData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      throw error;
    }
  }
};

// Serviço para Vendors
export const VendorsService = {
  // Buscar todos os fornecedores
  getVendors: async (schema) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vendor/get-vendors/${schema}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      throw error;
    }
  },

  // Criar novo fornecedor
  createVendor: async (vendorData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/vendor/create-vendor`, vendorData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  }
};

// Serviço para Tax Rates (Impostos)
export const TaxRatesService = {
  // Buscar todos os impostos
  getTaxRates: async (schema) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expenses/get-tax-rates/${schema}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar impostos:', error);
      throw error;
    }
  },

  // Criar novo imposto
  createTaxRate: async (taxRateData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/expenses/create-tax-rate`, taxRateData, {withCredentials:true});
      return response.data;
    } catch (error) {
      console.error('Erro ao criar imposto:', error);
      throw error;
    }
  }
};

export default {
  ExpensesService,
  CategoriesService,
  VendorsService,
  TaxRatesService
}; 