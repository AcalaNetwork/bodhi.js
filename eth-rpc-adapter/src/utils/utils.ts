import { assignTracerSpan, buildTracerSpan } from './datadog-util';
export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));
export const DataDogUtil = {
  buildTracerSpan,
  assignTracerSpan
};
