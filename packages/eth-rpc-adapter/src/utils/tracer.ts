import tracer from 'dd-trace';

tracer.init({
  service: 'eth rpc',
  logInjection: true,
});

export default tracer;
