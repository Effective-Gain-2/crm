// Script para atualizar os demais arquivos que usam alert
// Este script lista os arquivos que ainda precisam ser atualizados

const filesToUpdate = [
  'src/Pages/modalPages/Whatsapp_filas.jsx',
  'src/Pages/modalPages/Lembrete_novoLembrete.jsx',
  'src/Pages/modalPages/Kanban_novoFunil.jsx',
  'src/Pages/modalPages/Filas_webhook.jsx',
  'src/Pages/modalPages/Disparos_delete.jsx',
  'src/Pages/Lembretes.jsx',
  'src/Pages/Financeiro.jsx',
  'src/Pages/Kanban.jsx'
];

console.log('Arquivos que ainda precisam ser atualizados:');
filesToUpdate.forEach(file => {
  console.log(`- ${file}`);
});

console.log('\nPara cada arquivo, você precisa:');
console.log('1. Importar useToast: import { useToast } from \'../contexts/ToastContext\';');
console.log('2. Adicionar const { showError, showSuccess } = useToast(); na função principal');
console.log('3. Substituir alert() por showError() ou showSuccess()'); 