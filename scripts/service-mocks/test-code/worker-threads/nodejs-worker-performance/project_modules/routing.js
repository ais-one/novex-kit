const cpuIntensive = require('./cpuIntensive');

const configure = app => {
  app.get('/cpu-intensive/:type/:num/:threads', (req, res) => {
    if (req.params.type === '1') {
      console.log('asynch!');
      cpuIntensive.asynch_calculus(req.params.num).then(n => {
        res.json({ num: n });
      });
    }
    if (req.params.type === '2') {
      console.log('worker!');
      cpuIntensive.worker_calculus(req.params.num).then(n => {
        res.json({ num: n });
      });
    }
    if (req.params.type === '3') {
      console.log('worker_made!');
      cpuIntensive.worker_made_calculus(req.params.num).then(n => {
        res.json({ num: n });
      });
    }
    if (req.params.type === '4') {
      console.log('worker_pool!');
      cpuIntensive.worker_pool_calculus(req.params.num).then(n => {
        res.json({ num: n });
      });
    }
    if (req.params.type === '5') {
      console.log('worker_pool_2!');
      cpuIntensive.worker_pool_calculus2(req.params.num).then(n => {
        res.json({ num: n });
      });
    }
    if (req.params.type === '6') {
      console.log('worker_pool_array!');
      cpuIntensive.worker_array_calculus(req.params.num, req.params.threads).then(n => {
        res.json({ num: n });
      });
    }

    console.log('---');
  });
};

module.exports = {
  configure,
};
