const { Queue } = require('bullmq');
const createRedisConnection = require('./config/Redis');

const bullConn = createRedisConnection();

async function testWorker() {
  console.log('🧪 Testando worker de fechamento de chat...\n');

  try {
    const queue = new Queue('closeQueue', { connection: bullConn });
    
    // Adicionar um job de teste
    const testJob = await queue.add('closeChat', {
      chat_id: 'test-chat-id',
      status: 'resolvido',
      schema: 'effective_gain'
    });
    
    console.log('✅ Job de teste adicionado:', testJob.id);
    console.log('Dados do job:', testJob.data);
    
    // Verificar status da fila
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    
    console.log('\n📊 Status da fila:');
    console.log('- Jobs esperando:', waiting.length);
    console.log('- Jobs ativos:', active.length);
    console.log('- Jobs completados:', completed.length);
    console.log('- Jobs falhados:', failed.length);
    
    if (failed.length > 0) {
      console.log('\n❌ Último job falhado:');
      console.log('- ID:', failed[0].id);
      console.log('- Erro:', failed[0].failedReason);
      console.log('- Dados:', failed[0].data);
    }
    
    await queue.close();
    
  } catch (error) {
    console.error('❌ Erro ao testar worker:', error.message);
  }

  await bullConn.disconnect();
  console.log('\n✅ Teste concluído');
}

testWorker().catch(console.error); 