import pino from 'pino';

export default function pinoLogger(name: string): pino.Logger {
  return pino({ name, transport: { target: 'pino-pretty' } });
}
