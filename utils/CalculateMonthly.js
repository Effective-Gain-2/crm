const { getAllExpensesByMonth } = require("../services/ExpensesService")

const CalculateMonthly = async (schema) => {
    const expenses = await getAllExpensesByMonth(schema)
}

const calculateMonthlyGain = async (year, month, schema) => {
    try {
        // Implementação básica - retornar dados simulados por enquanto
        const baseValue = 15000;
        const randomVariation = Math.random() * 0.3 - 0.15; // Variação de -15% a +15%
        const monthlyGain = baseValue * (1 + randomVariation);
        
        return {
            year: year,
            month: month,
            saldo: Math.round(monthlyGain),
            schema: schema
        };
    } catch (error) {
        console.error('Erro ao calcular ganho mensal:', error);
        throw error;
    }
};

const calculateLastNMonthsGain = async (months, schema) => {
    try {
        const results = [];
        const currentDate = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            
            const monthlyGain = await calculateMonthlyGain(year, month, schema);
            results.push(monthlyGain);
        }
        
        return results;
    } catch (error) {
        console.error('Erro ao calcular ganhos dos últimos meses:', error);
        throw error;
    }
};

const calculateNextNMonthsProjection = async (months, schema) => {
    try {
        const results = [];
        const currentDate = new Date();
        
        for (let i = 1; i <= months; i++) {
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            
            // Projeção baseada em crescimento estimado
            const baseValue = 15000;
            const growthRate = 0.1; // 10% de crescimento mensal estimado
            const projectedGain = baseValue * Math.pow(1 + growthRate, i);
            
            results.push({
                year: year,
                month: month,
                saldo: Math.round(projectedGain),
                schema: schema,
                isProjection: true
            });
        }
        
        return results;
    } catch (error) {
        console.error('Erro ao calcular projeção dos próximos meses:', error);
        throw error;
    }
};

module.exports = {
    CalculateMonthly,
    calculateMonthlyGain,
    calculateLastNMonthsGain,
    calculateNextNMonthsProjection
};