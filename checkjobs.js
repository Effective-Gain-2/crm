const { Queue } = require('bullmq');

const bullConn = {
  host: '31.97.29.7',
  port: 6379,
  password: 'ilhadogovernadorredis'
};

async function checkJobs() {
  const queue = new Queue('Campanha', { connection: bullConn });

  const waiting = await queue.getWaiting();
  const active = await queue.getActive();

  console.log(`Jobs esperando: ${waiting.length}`);
  console.log(`Jobs ativos: ${active.length}`);

  if (waiting.length > 0) {
    console.log('Dados do primeiro job esperando:', waiting[0].data);
  }
}

checkJobs();
