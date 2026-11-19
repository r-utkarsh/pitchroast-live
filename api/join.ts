import joinHandler from '../server/handlers/join';
import type { ApiRequest, ApiResponse } from '../server/http';

export default function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return joinHandler(req, res);
}
